import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Card, Row, Col, Tag, InputNumber, Space, Avatar, Divider, Alert } from 'antd';
import { CalculatorOutlined, SplitCellsOutlined } from '@ant-design/icons';
import moment from 'moment';
import { toast } from 'react-toastify';
import { auth, db } from '../../Firebase';
import { addDoc, collection, setDoc, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import emailjs from 'emailjs-com';
import './styles.css';

const { TextArea } = Input;
const { Option } = Select;

function BillSplitter({ familyMembers = [] }) {
  const [user] = useAuthState(auth);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [splitType, setSplitType] = useState('equal'); // equal, percentage, custom
  const [totalAmount, setTotalAmount] = useState(0);
  const [splitMembers, setSplitMembers] = useState([]);
  const [splitResults, setSplitResults] = useState([]);
  const [balances, setBalances] = useState([]);
  const [sharedExpenses, setSharedExpenses] = useState([]);

  useEffect(() => {
    calculateSplit();
    if (user) {
      fetchBalances();
      // Real-time listener for shared expenses
      const expensesQuery = collection(db, `users/${user.uid}/expenses`);
      const unsubscribe = onSnapshot(expensesQuery, (querySnapshot) => {
        const shared = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isShared) shared.push({ id: doc.id, ...data });
        });
        setSharedExpenses(shared);
      });
      return () => unsubscribe();
    }
    // eslint-disable-next-line
  }, [user, familyMembers]);

  useEffect(() => {
    calculateSplit();
    // eslint-disable-next-line
  }, [splitMembers, totalAmount, splitType]);

  const showModal = () => {
    form.resetFields();
    setSplitType('equal');
    setTotalAmount(0);
    setSplitMembers(user ? [{
      id: user.uid,
      uid: user.uid,
      name: user.displayName || 'You',
      relation: 'Self',
      isUser: true
    }] : []);
    setSplitResults([]);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setSplitType('equal');
    setTotalAmount(0);
    setSplitMembers([]);
    setSplitResults([]);
  };

  const calculateSplit = () => {
    if (!totalAmount || splitMembers.length === 0) {
      setSplitResults([]);
      return;
    }
    // Prevent duplicate members
    const uniqueIds = new Set();
    for (const member of splitMembers) {
      const id = member.uid || member.id;
      if (uniqueIds.has(id)) {
        toast.error('Duplicate members are not allowed in the split.');
        setSplitResults([]);
        return;
      }
      uniqueIds.add(id);
    }
    const results = [];
    const amount = parseFloat(totalAmount);
    switch (splitType) {
      case 'equal':
        const equalAmount = amount / splitMembers.length;
        splitMembers.forEach(member => {
          results.push({
            ...member,
            id: member.uid || member.id,
            amount: equalAmount,
            percentage: (100 / splitMembers.length).toFixed(1)
          });
        });
        break;
      case 'percentage':
        let totalPercentage = 0;
        splitMembers.forEach(member => {
          const percentage = parseFloat(member.percentage || 0);
          totalPercentage += percentage;
          results.push({
            ...member,
            id: member.uid || member.id,
            amount: (amount * percentage) / 100,
            percentage: percentage
          });
        });
        if (Math.abs(totalPercentage - 100) > 0.1) {
          toast.error('Total percentage must equal 100%.');
          setSplitResults([]);
          return;
        }
        break;
      case 'custom':
        let totalCustom = 0;
        splitMembers.forEach(member => {
          const customAmount = parseFloat(member.customAmount || 0);
          totalCustom += customAmount;
          results.push({
            ...member,
            id: member.uid || member.id,
            amount: customAmount,
            percentage: ((customAmount / amount) * 100).toFixed(1)
          });
        });
        if (Math.abs(totalCustom - amount) > 0.01) {
          toast.error('Total custom amounts must equal the bill amount.');
          setSplitResults([]);
          return;
        }
        break;
      default:
        break;
    }
    setSplitResults(results);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      toast.info('Submitting bill...');
      console.log('handleSubmit called with values:', values);
      // Validate required data
      const amount = values.totalAmount || totalAmount;
      if (!amount || amount <= 0) {
        toast.error('Please enter a valid total amount');
        console.error('Invalid amount:', amount);
        setLoading(false);
        return;
      }
      if (familyMembers.length === 0) {
        toast.error('Please add family members first before splitting bills');
        console.error('No family members');
        setLoading(false);
        return;
      }
      if (splitResults.length === 0) {
        toast.error('Please select at least one family member to split with');
        console.error('No split results');
        setLoading(false);
        return;
      }
      if (!values.paidBy) {
        toast.error('Please select who paid the bill!');
        console.error('No paidBy selected');
        setLoading(false);
        return;
      }
      // Format date properly
      let formattedDate;
      if (values.date && values.date.format) {
        formattedDate = values.date.format('YYYY-MM-DD');
      } else if (values.date) {
        formattedDate = moment(values.date).format('YYYY-MM-DD');
      } else {
        formattedDate = moment().format('YYYY-MM-DD');
      }
      // Create shared expense record (for you only)
      const expenseData = {
        title: values.title || 'Shared Expense',
        amount: parseFloat(amount),
        category: values.category || 'other',
        date: formattedDate,
        description: values.description || '',
        isShared: true,
        splitType: splitType,
        splitMembers: splitResults.map(result => ({
          memberId: result.id,
          memberName: result.name,
          amount: result.amount,
          percentage: result.percentage,
          email: result.email
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.uid,
        paidBy: values.paidBy,
        isPaid: true
      };
      // Only add your own share to your expenses
      for (const result of splitResults) {
        if (result.id === user.uid) {
          const myExpenseData = {
            ...expenseData,
            userId: user.uid,
            paidBy: values.paidBy,
            amount: result.amount,
            percentage: result.percentage,
            isPaid: true,
            isOwed: false,
            mainExpenseId: null
          };
          await addDoc(collection(db, `users/${user.uid}/expenses`), deepRemoveUndefined(myExpenseData));
        } else if (result.email) {
          // Send email to other participants
          try {
            await emailjs.send(
              'YOUR_SERVICE_ID', // Replace with your EmailJS service ID
              'YOUR_TEMPLATE_ID', // Replace with your EmailJS template ID
              {
                to_email: result.email,
                from_name: user.displayName || 'A friend',
                message: `You have been added to a shared bill: ${expenseData.title}, Amount: ₹${result.amount}`
              },
              'YOUR_USER_ID' // Replace with your EmailJS user ID
            );
          } catch (emailError) {
            toast.error(`Failed to send email to ${result.name}`);
          }
        }
      }
      toast.success('Shared expense created and emails sent!');
      handleCancel();
    } catch (error) {
      console.error('Error creating shared expense:', error);
      toast.error('Failed to create shared expense: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    if (!user) return;
    const balancesCol = collection(db, `users/${user.uid}/balances`);
    const snapshot = await getDocs(balancesCol);
    const data = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    setBalances(data);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (name) => {
    const colors = [
      '#f56565', '#ed8936', '#ecc94b', '#48bb78', 
      '#38b2ac', '#4299e1', '#667eea', '#9f7aea',
      '#ed64a6', '#f687b3'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const expenseCategories = [
    { value: 'food', label: 'Food & Dining', icon: '🍽️' },
    { value: 'transport', label: 'Transportation', icon: '🚗' },
    { value: 'housing', label: 'Housing & Rent', icon: '🏠' },
    { value: 'utilities', label: 'Utilities', icon: '⚡' },
    { value: 'groceries', label: 'Groceries', icon: '🛒' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { value: 'health', label: 'Healthcare', icon: '🏥' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'travel', label: 'Travel', icon: '✈️' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'other', label: 'Other', icon: '📦' }
  ];

  // Helper to get all selectable members (user + family)
  const getAllMembers = () => {
    const self = {
      id: user?.uid,
      uid: user?.uid,
      name: user?.displayName || 'You',
      relation: 'Self',
      isUser: true
    };
    return user ? [self, ...familyMembers] : familyMembers;
  };

  // Utility to deep remove undefined fields from an object or array
  function deepRemoveUndefined(obj) {
    if (Array.isArray(obj)) {
      return obj.map(deepRemoveUndefined);
    } else if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, deepRemoveUndefined(v)])
      );
    }
    return obj;
  }

  return (
    <div className="bill-splitter-wrapper">
      <div className="bill-splitter-header">
        <h2>Bill Splitter</h2>
        <Button 
          type="primary" 
          icon={<SplitCellsOutlined />} 
          onClick={showModal}
          className="split-bill-btn"
          disabled={familyMembers.length === 0}
        >
          Split Bill
        </Button>
      </div>

      {/* Who Owes Whom Summary */}
      <Card className="balances-summary-card" style={{ marginBottom: 24 }}>
        <h4>Who Owes Whom</h4>
        {balances.length === 0 ? (
          <p>No balances to show.</p>
        ) : (
          <ul style={{ paddingLeft: 20 }}>
            {balances.map(bal => {
              const member = familyMembers.find(m => m.id === bal.id);
              const name = member ? member.name : bal.id;
              if (bal.amount > 0) {
                return <li key={bal.id}><b>{name}</b> owes you <b>₹{bal.amount.toFixed(2)}</b></li>;
              } else if (bal.amount < 0) {
                return <li key={bal.id}>You owe <b>{name}</b> <b>₹{Math.abs(bal.amount).toFixed(2)}</b></li>;
              } else {
                return null;
              }
            })}
          </ul>
        )}
      </Card>

      {/* Shared Transactions Table */}
      <Card className="shared-transactions-card" style={{ marginBottom: 24 }}>
        <h4>Shared Transactions Details</h4>
        {sharedExpenses.filter(exp => !('percentage' in exp) || exp.percentage === 100).length === 0 ? (
          <p>No shared transactions found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="shared-transactions-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payer</th>
                  <th>Participants</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sharedExpenses.filter(exp => !('percentage' in exp) || exp.percentage === 100).map(exp => (
                  <tr key={exp.id}>
                    <td>{exp.title}</td>
                    <td>{exp.category}</td>
                    <td>{exp.date}</td>
                    <td>₹{exp.amount.toFixed(2)}</td>
                    <td>{(() => {
                      const payer = familyMembers.find(m => m.id === exp.paidBy) || (user && exp.paidBy === user.uid ? { name: 'You' } : null);
                      return payer ? payer.name : exp.paidBy;
                    })()}</td>
                    <td>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {exp.splitMembers && exp.splitMembers.map((m, i) => (
                          <li key={i}>
                            {(() => {
                              const member = familyMembers.find(fm => fm.id === m.memberId) || (user && m.memberId === user.uid ? { name: 'You' } : null);
                              return member ? member.name : m.memberName || m.memberId;
                            })()}
                            : ₹{m.amount.toFixed(2)} ({m.percentage}%)
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{exp.isPaid ? 'Paid' : 'Owed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Instructions Card */}
      <Card className="instructions-card">
        <div className="instructions-content">
          <CalculatorOutlined className="instructions-icon" />
          <div className="instructions-text">
            <h4>Split Bills with Family</h4>
            {familyMembers.length === 0 ? (
              <div>
                <p style={{ color: '#f59e0b', fontWeight: 500 }}>
                  ⚠️ No family members found. Please add family members first to split bills.
                </p>
                <p>Once you have family members, you can:</p>
              </div>
            ) : (
              <p>Easily split shared expenses like rent, groceries, and utilities with your family members or roommates.</p>
            )}
            <ul>
              <li>Equal split - Divide the bill equally among all members</li>
              <li>Percentage split - Split based on custom percentages</li>
              <li>Custom amounts - Specify exact amounts for each person</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Split Bill Modal */}
      <Modal
        title="Split Bill"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Bill Title"
                rules={[{ required: true, message: 'Please enter bill title!' }]}
              >
                <Input placeholder="e.g., Monthly Rent, Groceries" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category!' }]}
              >
                <Select placeholder="Select category">
                  {expenseCategories.map(category => (
                    <Option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select date!' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  placeholder="Select date"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="totalAmount"
                label="Total Amount"
                rules={[{ required: true, message: 'Please enter total amount!' }]}
              >
                <InputNumber
                  placeholder="Enter total amount"
                  prefix="₹"
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  onChange={(value) => setTotalAmount(value)}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Paid By Selector */}
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item
                name="paidBy"
                label="Paid By"
                rules={[{ required: true, message: 'Please select who paid the bill!' }]}
                initialValue={user ? user.uid : undefined}
              >
                <Select placeholder="Select payer">
                  {getAllMembers().map(member => (
                    <Option key={member.uid || member.id} value={member.uid || member.id}>
                      {member.name} {member.relation ? `(${member.relation})` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              rows={3} 
              placeholder="Any additional details about the bill..."
            />
          </Form.Item>

          <Divider>Split Configuration</Divider>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item label="Split Type">
                <Select 
                  value={splitType} 
                  onChange={setSplitType}
                  placeholder="Select split type"
                >
                  <Option value="equal">Equal Split</Option>
                  <Option value="percentage">Percentage Split</Option>
                  <Option value="custom">Custom Amounts</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="Select Members">
                <Select
                  mode="multiple"
                  placeholder="Select members to split with"
                  value={splitMembers.map(m => m.uid || m.id)}
                  onChange={(selectedIds) => {
                    const allMembers = getAllMembers();
                    const selectedMembers = allMembers.filter(m => selectedIds.includes(m.uid || m.id));
                    setSplitMembers(selectedMembers);
                  }}
                >
                  {getAllMembers().map(member => (
                    <Option key={member.uid || member.id} value={member.uid || member.id}>
                      <Space>
                        <Avatar 
                          size="small"
                          style={{ backgroundColor: getRandomColor(member.name) }}
                        >
                          {getInitials(member.name)}
                        </Avatar>
                        {member.name} {member.relation ? `(${member.relation})` : ''}
                        {member.uid && <span style={{ color: '#48bb78', fontWeight: 600, marginLeft: 4 }}>✔️</span>}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Split Results */}
          {splitResults.length > 0 && (
            <div className="split-results">
              <h4>Split Results</h4>
              <Row gutter={[16, 16]}>
                {splitResults.map((result, index) => (
                  <Col span={8} key={index}>
                    <Card className="split-result-card">
                      <div className="result-content">
                        <Avatar 
                          size="large"
                          style={{ backgroundColor: getRandomColor(result.name) }}
                        >
                          {getInitials(result.name)}
                        </Avatar>
                        <div className="result-details">
                          <h5>{result.name}</h5>
                          <p className="result-amount">₹{result.amount.toFixed(2)}</p>
                          <Tag color="blue">{result.percentage}%</Tag>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              {splitType === 'percentage' && (
                <Alert
                  message="Percentage Split"
                  description="Make sure the total percentage equals 100%"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
              
              {splitType === 'custom' && (
                <Alert
                  message="Custom Amounts"
                  description="Make sure the total custom amounts equal the bill amount"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </div>
          )}

          {splitMembers.some(m => !m.uid) && (
            <Alert
              message="Warning: Some selected members are not linked to real users. Their balances and expenses will only be visible to you."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item style={{ marginTop: 24 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              disabled={splitResults.length === 0}
            >
              Create Shared Expense
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default BillSplitter; 