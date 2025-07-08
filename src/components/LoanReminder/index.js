import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Tag, Button } from 'antd';
import { BellOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import moment from 'moment';
import { toast } from 'react-toastify';
import './styles.css';

function LoanReminder({ loans }) {
  const [reminders, setReminders] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loans && loans.length > 0) {
      const today = moment();
      const reminderLoans = loans.filter(loan => {
        if (loan.isPaid) return false;
        
        const dueDate = moment(loan.dueDate);
        const daysUntilDue = dueDate.diff(today, 'days');
        
        // Show overdue loans and loans due within 7 days
        return dueDate.isBefore(today) || (daysUntilDue <= 7 && daysUntilDue >= 0);
      });
      
      setReminders(reminderLoans);
    }
  }, [loans]);

  const getReminderType = (loan) => {
    const dueDate = moment(loan.dueDate);
    const today = moment();
    
    if (dueDate.isBefore(today)) {
      return 'overdue';
    } else if (dueDate.isSame(today, 'day')) {
      return 'today';
    } else if (dueDate.diff(today, 'days') === 1) {
      return 'tomorrow';
    } else {
      return 'upcoming';
    }
  };

  const getReminderIcon = (type) => {
    switch (type) {
      case 'overdue':
        return <ExclamationCircleOutlined style={{ color: '#ef4444' }} />;
      case 'today':
        return <ExclamationCircleOutlined style={{ color: '#f59e0b' }} />;
      case 'tomorrow':
        return <ClockCircleOutlined style={{ color: '#3b82f6' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#10b981' }} />;
    }
  };

  const getReminderColor = (type) => {
    switch (type) {
      case 'overdue':
        return 'error';
      case 'today':
        return 'warning';
      case 'tomorrow':
        return 'processing';
      default:
        return 'success';
    }
  };

  const getReminderText = (loan, type) => {
    const dueDate = moment(loan.dueDate);
    const today = moment();
    
    switch (type) {
      case 'overdue':
        const overdueDays = today.diff(dueDate, 'days');
        return `${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`;
      case 'today':
        return 'Due today';
      case 'tomorrow':
        return 'Due tomorrow';
      default:
        const daysUntilDue = dueDate.diff(today, 'days');
        return `Due in ${daysUntilDue} days`;
    }
  };

  const reminderContent = (
    <div className="reminder-popover">
      <div className="reminder-header">
        <h4>Loan Reminders</h4>
        <span className="reminder-count">{reminders.length}</span>
      </div>
      
      {reminders.length === 0 ? (
        <div className="no-reminders">
          <p>No pending loan reminders</p>
        </div>
      ) : (
        <List
          size="small"
          dataSource={reminders}
          renderItem={(loan) => {
            const type = getReminderType(loan);
            return (
              <List.Item className="reminder-item">
                <div className="reminder-content">
                  <div className="reminder-icon">
                    {getReminderIcon(type)}
                  </div>
                  <div className="reminder-details">
                    <div className="reminder-person">
                      {loan.personName}
                      <Tag color={loan.type === 'borrowed' ? 'red' : 'green'} size="small">
                        {loan.type === 'borrowed' ? 'Borrowed' : 'Lent'}
                      </Tag>
                    </div>
                    <div className="reminder-amount">
                      ₹{loan.amount.toLocaleString()}
                    </div>
                    <div className="reminder-status">
                      <Tag color={getReminderColor(type)} size="small">
                        {getReminderText(loan, type)}
                      </Tag>
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );

  return (
    <div className="loan-reminder">
      <Popover
        content={reminderContent}
        title={null}
        trigger="click"
        visible={visible}
        onVisibleChange={setVisible}
        placement="bottomRight"
        overlayClassName="reminder-popover-overlay"
      >
        <Badge count={reminders.length} size="small">
          <Button
            type="text"
            icon={<BellOutlined />}
            className="reminder-button"
            size="large"
          />
        </Badge>
      </Popover>
    </div>
  );
}

export default LoanReminder; 