import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Card, Row, Col, Tag, InputNumber, Space, Avatar } from 'antd';
import { PlusOutlined, UserOutlined, TeamOutlined, DollarOutlined, CalculatorOutlined } from '@ant-design/icons';
import moment from 'moment';
import { toast } from 'react-toastify';
import { auth, db } from '../../Firebase';
import { addDoc, collection, getDocs, query, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import './styles.css';

const { TextArea } = Input;
const { Option } = Select;

function ExpenseTracker() {
  const [user] = useAuthState(auth);
  const [expenses, setExpenses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, personal, shared, category
  const [selectedCategory, setSelectedCategory] = useState('all');


  // Expense categories
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

  // Fetch expenses from Firebase (real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/expenses`));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesArray = [];
      querySnapshot.forEach((doc) => {
        expensesArray.push({ id: doc.id, ...doc.data() });
      });
      setExpenses(expensesArray);
    });
    return () => unsubscribe();
  }, [user]);

  const showModal = (expense = null) => {
    setEditingExpense(expense);
    if (expense) {
      form.setFieldsValue({
        ...expense,
        date: moment(expense.date),
        amount: expense.amount.toString(),
        splitMembers: expense.splitMembers || []
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingExpense(null);
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
      // Validate required fields
      if (!values.title || !values.category || !values.date) {
        toast.error('Please fill all required fields.');
        setLoading(false);
        return;
      }
      const expenseData = {
        ...values,
        amount: parseFloat(values.amount),
        date: values.date.format('YYYY-MM-DD'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.uid,
        paidBy: user.uid,
        isPaid: true
      };
      if (editingExpense) {
        // Update existing expense
        await updateDoc(doc(db, `users/${user.uid}/expenses`, editingExpense.id), {
          ...expenseData,
          updatedAt: new Date().toISOString()
        });
        toast.success('Expense updated successfully!');
      } else {
        // Add new expense
        await addDoc(collection(db, `users/${user.uid}/expenses`), expenseData);
        toast.success('Expense added successfully!');
      }
      handleCancel();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/expenses`, expenseId));
      toast.success('Expense deleted successfully!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const getFilteredExpenses = () => {
    let filtered = expenses;
    
    if (filter === 'personal') {
      filtered = filtered.filter(expense => !expense.isShared);
    } else if (filter === 'shared') {
      filtered = filtered.filter(expense => expense.isShared);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }
    
    return filtered.sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
  };

  const getCategoryIcon = (category) => {
    const cat = expenseCategories.find(c => c.value === category);
    return cat ? cat.icon : '📦';
  };

  const getCategoryLabel = (category) => {
    const cat = expenseCategories.find(c => c.value === category);
    return cat ? cat.label : 'Other';
  };

  const getTotalAmount = (type) => {
    return expenses
      .filter(expense => {
        if (type === 'personal') return !expense.isShared;
        if (type === 'shared') return expense.isShared;
        return true;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getCategoryTotal = (category) => {
    return expenses
      .filter(expense => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const filteredExpenses = getFilteredExpenses();

  // Filtered expenses for display: only show expenses added by the current user (their own share)
  const displayExpenses = filteredExpenses.filter(expense => {
    // Only show if this expense was added by the current user
    return expense.userId === (user && user.uid);
  });

  return (
    <div className="expense-tracker-wrapper">
      <div className="expense-tracker-header">
        <h2>Expense Tracker</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
          className="add-expense-btn"
        >
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="summary-cards">
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card total">
            <div className="card-content">
              <DollarOutlined className="card-icon" />
              <div className="card-text">
                <h4>Total Expenses</h4>
                <p>₹{getTotalAmount('all').toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card personal">
            <div className="card-content">
              <UserOutlined className="card-icon" />
              <div className="card-text">
                <h4>Personal</h4>
                <p>₹{getTotalAmount('personal').toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card shared">
            <div className="card-content">
              <TeamOutlined className="card-icon" />
              <div className="card-text">
                <h4>Shared</h4>
                <p>₹{getTotalAmount('shared').toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card categories">
            <div className="card-content">
              <CalculatorOutlined className="card-icon" />
              <div className="card-text">
                <h4>Categories</h4>
                <p>{expenseCategories.length}</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Category Breakdown */}
      <Card className="category-breakdown" title="Category Breakdown">
        <Row gutter={[16, 16]}>
          {expenseCategories.map(category => {
            const total = getCategoryTotal(category.value);
            if (total === 0) return null;
            
            return (
              <Col xs={12} sm={8} md={6} lg={4} key={category.value}>
                <div className="category-item">
                  <div className="category-icon">{category.icon}</div>
                  <div className="category-info">
                    <h5>{category.label}</h5>
                    <p>₹{total.toLocaleString()}</p>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Filter Controls */}
      <div className="filter-controls">
        <Space>
          <Select 
            value={filter} 
            onChange={setFilter}
            className="filter-select"
            placeholder="Filter by type"
          >
            <Option value="all">All Expenses</Option>
            <Option value="personal">Personal</Option>
            <Option value="shared">Shared</Option>
          </Select>
          
          <Select 
            value={selectedCategory} 
            onChange={setSelectedCategory}
            className="filter-select"
            placeholder="Filter by category"
          >
            <Option value="all">All Categories</Option>
            {expenseCategories.map(category => (
              <Option key={category.value} value={category.value}>
                {category.icon} {category.label}
              </Option>
            ))}
          </Select>
        </Space>
      </div>

      {/* Expenses List */}
      <div className="expenses-list">
        {displayExpenses.length === 0 ? (
          <div className="empty-state">
            <UserOutlined className="empty-icon" />
            <h3>No expenses found</h3>
            <p>Add your first expense to start tracking your spending.</p>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {displayExpenses.map(expense => (
              <Col xs={24} sm={12} lg={8} key={expense.id}>
                <Card 
                  className={`expense-card ${expense.isShared ? 'shared' : 'personal'}`}
                  actions={[
                    <Button 
                      key="edit" 
                      type="link" 
                      onClick={() => showModal(expense)}
                    >
                      Edit
                    </Button>,
                    <Button 
                      key="delete" 
                      type="link" 
                      danger
                      onClick={() => deleteExpense(expense.id)}
                    >
                      Delete
                    </Button>
                  ]}
                >
                  <div className="expense-header">
                    <div className="expense-category">
                      <span className="category-icon">{getCategoryIcon(expense.category)}</span>
                      <Tag color={expense.isShared ? 'blue' : 'green'}>
                        {expense.isShared ? 'Shared' : 'Personal'}
                      </Tag>
                    </div>
                    <div className="expense-amount">
                      ₹{expense.amount.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="expense-details">
                    <h4>{expense.title}</h4>
                    <p><strong>Category:</strong> {getCategoryLabel(expense.category)}</p>
                    <p><strong>Date:</strong> {moment(expense.date).format('MMM DD, YYYY')}</p>
                    {expense.description && <p><strong>Description:</strong> {expense.description}</p>}
                    {expense.isShared && expense.splitMembers && expense.splitMembers.length > 0 && (
                      <div className="split-info">
                        <strong>Participants:</strong>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                          {expense.splitMembers.map((member, idx) => (
                            <li key={idx}>
                              {member.memberName || member.memberId}: ₹{member.amount?.toLocaleString() || 0} ({member.percentage}%)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
            name="title"
            label="Expense Title"
            rules={[{ required: true, message: 'Please enter expense title!' }]}
          >
            <Input placeholder="Enter expense title" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter amount!' }]}
          >
            <InputNumber 
              placeholder="Enter amount" 
              prefix="₹" 
              style={{ width: '100%' }}
              min={0}
              step={0.01}
            />
          </Form.Item>

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

          <Form.Item
            name="isShared"
            label="Expense Type"
          >
            <Select placeholder="Select expense type">
              <Option value={false}>Personal Expense</Option>
              <Option value={true}>Shared Expense</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              rows={3} 
              placeholder="Any additional details..."
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
            >
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ExpenseTracker; 