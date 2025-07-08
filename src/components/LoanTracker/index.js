import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Card, Row, Col, Tag, Badge, Tooltip } from 'antd';
import { PlusOutlined, BellOutlined, UserOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import moment from 'moment';
import { toast } from 'react-toastify';
import { auth, db } from '../../Firebase';
import { addDoc, collection, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import './styles.css';

const { TextArea } = Input;
const { Option } = Select;

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

function LoanTracker({ onLoanUpdate }) {
  const [user] = useAuthState(auth);
  const [loans, setLoans] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, borrowed, lent, overdue, upcoming

  // Fetch loans from Firebase
  const fetchLoans = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const q = query(collection(db, `users/${user.uid}/loans`));
      const querySnapshot = await getDocs(q);
      const loansArray = [];
      querySnapshot.forEach((doc) => {
        loansArray.push({ id: doc.id, ...doc.data() });
      });
      setLoans(loansArray);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [user]);

  // Check for overdue loans and show reminders
  useEffect(() => {
    const checkOverdueLoans = () => {
      const today = moment();
      const overdueLoans = loans.filter(loan => {
        const dueDate = moment(loan.dueDate);
        return dueDate.isBefore(today) && !loan.isPaid;
      });

      const upcomingLoans = loans.filter(loan => {
        const dueDate = moment(loan.dueDate);
        const daysUntilDue = dueDate.diff(today, 'days');
        return daysUntilDue <= 3 && daysUntilDue >= 0 && !loan.isPaid;
      });

      if (overdueLoans.length > 0) {
        toast.warning(`You have ${overdueLoans.length} overdue loan(s)!`);
      }

      if (upcomingLoans.length > 0) {
        toast.info(`You have ${upcomingLoans.length} loan(s) due soon!`);
      }
    };

    if (loans.length > 0) {
      checkOverdueLoans();
    }
  }, [loans]);

  const showModal = (loan = null) => {
    setEditingLoan(loan);
    if (loan) {
      form.setFieldsValue({
        ...loan,
        dueDate: moment(loan.dueDate),
        amount: loan.amount.toString()
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingLoan(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      // Validate amount
      if (!values.amount || isNaN(values.amount) || parseFloat(values.amount) <= 0) {
        toast.error('Please enter a valid positive amount.');
        setLoading(false);
        return;
      }
      // Validate due date
      const dueDate = values.dueDate && values.dueDate.format ? values.dueDate : moment(values.dueDate);
      if (!dueDate || dueDate.isBefore(moment(), 'day')) {
        toast.error('Due date must be today or in the future.');
        setLoading(false);
        return;
      }
      const loanData = {
        ...values,
        amount: parseFloat(values.amount),
        dueDate: dueDate.format('YYYY-MM-DD'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPaid: false,
        userId: user.uid
      };
      if (editingLoan) {
        // Update existing loan
        await updateDoc(doc(db, `users/${user.uid}/loans`, editingLoan.id), {
          ...deepRemoveUndefined(loanData),
          updatedAt: new Date().toISOString()
        });
        toast.success('Loan updated successfully!');
      } else {
        // Add new loan
        await addDoc(collection(db, `users/${user.uid}/loans`), deepRemoveUndefined(loanData));
        toast.success('Loan added successfully!');
      }
      fetchLoans();
      if (onLoanUpdate) onLoanUpdate();
      handleCancel();
    } catch (error) {
      console.error('Error saving loan:', error);
      toast.error('Failed to save loan');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (loanId) => {
    try {
      if (!window.confirm('Are you sure you want to mark this loan as paid?')) return;
      await updateDoc(doc(db, `users/${user.uid}/loans`, loanId), {
        isPaid: true,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('Loan marked as paid!');
      fetchLoans();
      if (onLoanUpdate) onLoanUpdate();
    } catch (error) {
      console.error('Error updating loan:', error);
      toast.error('Failed to update loan');
    }
  };

  const deleteLoan = async (loanId) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/loans`, loanId));
      toast.success('Loan deleted successfully!');
      fetchLoans();
      if (onLoanUpdate) onLoanUpdate();
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast.error('Failed to delete loan');
    }
  };

  const getFilteredLoans = () => {
    const today = moment();
    return loans.filter(loan => {
      const dueDate = moment(loan.dueDate);
      const daysUntilDue = dueDate.diff(today, 'days');
      
      switch (filter) {
        case 'borrowed':
          return loan.type === 'borrowed';
        case 'lent':
          return loan.type === 'lent';
        case 'overdue':
          return dueDate.isBefore(today) && !loan.isPaid;
        case 'upcoming':
          return daysUntilDue <= 7 && daysUntilDue >= 0 && !loan.isPaid;
        default:
          return true;
      }
    });
  };

  const getStatusColor = (loan) => {
    if (loan.isPaid) return 'success';
    const dueDate = moment(loan.dueDate);
    const today = moment();
    if (dueDate.isBefore(today)) return 'error';
    if (dueDate.diff(today, 'days') <= 3) return 'warning';
    return 'default';
  };

  const getStatusText = (loan) => {
    if (loan.isPaid) return 'Paid';
    const dueDate = moment(loan.dueDate);
    const today = moment();
    if (dueDate.isBefore(today)) return 'Overdue';
    const daysUntilDue = dueDate.diff(today, 'days');
    if (daysUntilDue === 0) return 'Due Today';
    if (daysUntilDue === 1) return 'Due Tomorrow';
    if (daysUntilDue <= 7) return `Due in ${daysUntilDue} days`;
    return 'Upcoming';
  };

  const getTotalAmount = (type) => {
    return loans
      .filter(loan => loan.type === type && !loan.isPaid)
      .reduce((sum, loan) => sum + loan.amount, 0);
  };

  const filteredLoans = getFilteredLoans();

  return (
    <div className="loan-tracker-wrapper">
      <div className="loan-tracker-header">
        <h2>Loan Tracker</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
          className="add-loan-btn"
        >
          Add Loan
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="summary-cards">
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card borrowed">
            <div className="card-content">
              <DollarOutlined className="card-icon" />
              <div className="card-text">
                <h4>Borrowed</h4>
                <p>₹{getTotalAmount('borrowed').toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card lent">
            <div className="card-content">
              <DollarOutlined className="card-icon" />
              <div className="card-text">
                <h4>Lent</h4>
                <p>₹{getTotalAmount('lent').toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card overdue">
            <div className="card-content">
              <BellOutlined className="card-icon" />
              <div className="card-text">
                <h4>Overdue</h4>
                <p>{loans.filter(loan => moment(loan.dueDate).isBefore(moment()) && !loan.isPaid).length}</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card upcoming">
            <div className="card-content">
              <CalendarOutlined className="card-icon" />
              <div className="card-text">
                <h4>Due Soon</h4>
                <p>{loans.filter(loan => {
                  const daysUntilDue = moment(loan.dueDate).diff(moment(), 'days');
                  return daysUntilDue <= 7 && daysUntilDue >= 0 && !loan.isPaid;
                }).length}</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter Controls */}
      <div className="filter-controls">
        <Select 
          value={filter} 
          onChange={setFilter}
          className="filter-select"
        >
          <Option value="all">All Loans</Option>
          <Option value="borrowed">Borrowed</Option>
          <Option value="lent">Lent</Option>
          <Option value="overdue">Overdue</Option>
          <Option value="upcoming">Due Soon</Option>
        </Select>
      </div>

      {/* Loans List */}
      <div className="loans-list">
        {filteredLoans.length === 0 ? (
          <div className="empty-state">
            <UserOutlined className="empty-icon" />
            <h3>No loans found</h3>
            <p>Add your first loan to start tracking borrowed and lent money.</p>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredLoans.map(loan => (
              <Col xs={24} sm={12} lg={8} key={loan.id}>
                <Card 
                  className={`loan-card ${loan.type}`}
                  actions={[
                    <Button 
                      key="edit" 
                      type="link" 
                      onClick={() => showModal(loan)}
                    >
                      Edit
                    </Button>,
                    <Button 
                      key="paid" 
                      type="link" 
                      onClick={() => markAsPaid(loan.id)}
                      disabled={loan.isPaid}
                    >
                      Mark Paid
                    </Button>,
                    <Button 
                      key="delete" 
                      type="link" 
                      danger
                      onClick={() => deleteLoan(loan.id)}
                    >
                      Delete
                    </Button>
                  ]}
                >
                  <div className="loan-header">
                    <div className="loan-type">
                      <Tag color={loan.type === 'borrowed' ? 'red' : 'green'}>
                        {loan.type === 'borrowed' ? 'Borrowed' : 'Lent'}
                      </Tag>
                      <Badge 
                        status={getStatusColor(loan)} 
                        text={getStatusText(loan)}
                      />
                    </div>
                    <div className="loan-amount">
                      ₹{loan.amount.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="loan-details">
                    <p><strong>Person:</strong> {loan.personName}</p>
                    <p><strong>Due Date:</strong> {moment(loan.dueDate).format('MMM DD, YYYY')}</p>
                    {loan.reason && <p><strong>Reason:</strong> {loan.reason}</p>}
                    {loan.notes && <p><strong>Notes:</strong> {loan.notes}</p>}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Add/Edit Loan Modal */}
      <Modal
        title={editingLoan ? 'Edit Loan' : 'Add New Loan'}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="type"
            label="Loan Type"
            rules={[{ required: true, message: 'Please select loan type!' }]}
          >
            <Select placeholder="Select loan type">
              <Option value="borrowed">Borrowed Money</Option>
              <Option value="lent">Lent Money</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="personName"
            label="Person Name"
            rules={[{ required: true, message: 'Please enter person name!' }]}
          >
            <Input placeholder="Enter person name" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter amount!' }]}
          >
            <Input type="number" placeholder="Enter amount" prefix="₹" />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="Due Date"
            rules={[{ required: true, message: 'Please select due date!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Select due date"
              disabledDate={(current) => current && current < moment().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
          >
            <Input placeholder="Why was the money borrowed/lent?" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Additional Notes"
          >
            <TextArea 
              rows={3} 
              placeholder="Any additional notes or details..."
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
            >
              {editingLoan ? 'Update Loan' : 'Add Loan'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default LoanTracker; 