import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Card, Row, Col, Avatar, Popconfirm } from 'antd';
import { PlusOutlined, UserOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { auth, db } from '../../Firebase';
import { addDoc, collection, getDocs, query, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';
import './styles.css';

const { Option } = Select;

function FamilyMembers({ onMemberUpdate }) {
  const [user] = useAuthState(auth);
  const [members, setMembers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [inviteNeeded, setInviteNeeded] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Fetch family members from Firebase
  const fetchMembers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const q = query(collection(db, `users/${user.uid}/family`));
      const querySnapshot = await getDocs(q);
      const membersArray = [];
      querySnapshot.forEach((doc) => {
        membersArray.push({ id: doc.id, ...doc.data() });
      });
      setMembers(membersArray);
    } catch (error) {
      console.error('Error fetching family members:', error);
      toast.error('Failed to fetch family members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const showModal = (member = null) => {
    setEditingMember(member);
    if (member) {
      form.setFieldsValue(member);
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingMember(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      // Prevent adding yourself
      if (values.email && values.email === user.email) {
        toast.error('You cannot add yourself as a family member.');
        setLoading(false);
        return;
      }
      // Prevent duplicate members
      const duplicate = members.find(m => m.email && values.email && m.email.toLowerCase() === values.email.toLowerCase());
      if (duplicate && (!editingMember || editingMember.id !== duplicate.id)) {
        toast.error('This family member is already added.');
        setLoading(false);
        return;
      }
      let linkedUid = null;
      let invite = false;
      if (values.email) {
        const authInstance = getAuth();
        try {
          const methods = await fetchSignInMethodsForEmail(authInstance, values.email);
          if (methods && methods.length > 0) {
            linkedUid = values.email;
            setInviteNeeded(false);
          } else {
            setInviteNeeded(true);
            setInviteEmail(values.email);
            invite = true;
            toast.info('Invitation will be sent to this email.');
          }
        } catch (e) {
          setInviteNeeded(true);
          setInviteEmail(values.email);
          invite = true;
          toast.error('Failed to check email for invitation.');
        }
      } else {
        setInviteNeeded(false);
        setInviteEmail("");
      }
      const memberData = {
        ...values,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.uid,
        uid: linkedUid,
        invited: invite
      };
      if (editingMember) {
        await updateDoc(doc(db, `users/${user.uid}/family`, editingMember.id), {
          ...memberData,
          updatedAt: new Date().toISOString()
        });
        toast.success('Family member updated successfully!');
      } else {
        await addDoc(collection(db, `users/${user.uid}/family`), memberData);
        toast.success('Family member added successfully!');
      }
      fetchMembers();
      if (onMemberUpdate) onMemberUpdate();
      handleCancel();
    } catch (error) {
      console.error('Error saving family member:', error);
      toast.error('Failed to save family member');
    } finally {
      setLoading(false);
    }
  };

  const deleteMember = async (memberId) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (member && member.email === user.email) {
        toast.error('You cannot remove yourself from the family.');
        return;
      }
      await deleteDoc(doc(db, `users/${user.uid}/family`, memberId));
      toast.success('Family member deleted successfully!');
      fetchMembers();
      if (onMemberUpdate) onMemberUpdate();
    } catch (error) {
      console.error('Error deleting family member:', error);
      toast.error('Failed to delete family member');
    }
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

  return (
    <div className="family-members-wrapper">
      <div className="family-members-header">
        <h2>Family Members</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
          className="add-member-btn"
        >
          Add Member
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="summary-card">
        <div className="summary-content">
          <TeamOutlined className="summary-icon" />
          <div className="summary-text">
            <h4>Total Members</h4>
            <p>{members.length + 1}</p>
            <span className="summary-note">Including yourself</span>
          </div>
        </div>
      </Card>

      {/* Members List */}
      <div className="members-list">
        {members.length === 0 ? (
          <div className="empty-state">
            <UserOutlined className="empty-icon" />
            <h3>No family members added</h3>
            <p>Add family members to start tracking shared expenses together.</p>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {members.map(member => (
              <Col xs={24} sm={12} lg={8} key={member.id}>
                <Card 
                  className="member-card"
                  actions={[
                    <Button 
                      key="edit" 
                      type="link" 
                      icon={<EditOutlined />}
                      onClick={() => showModal(member)}
                    >
                      Edit
                    </Button>,
                    <Popconfirm
                      title="Delete Family Member"
                      description="Are you sure you want to delete this family member?"
                      onConfirm={() => deleteMember(member.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button 
                        key="delete" 
                        type="link" 
                        danger
                        icon={<DeleteOutlined />}
                      >
                        Delete
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <div className="member-content">
                    <div className="member-avatar">
                      <Avatar 
                        size={64}
                        style={{ 
                          backgroundColor: getRandomColor(member.name),
                          fontSize: '1.5rem',
                          fontWeight: 600
                        }}
                      >
                        {getInitials(member.name)}
                      </Avatar>
                      {member.uid && (
                        <span style={{ marginLeft: 8, color: '#48bb78', fontWeight: 600 }} title="Linked to real user">✔️</span>
                      )}
                    </div>
                    
                    <div className="member-info">
                      <h4>{member.name}</h4>
                      <p className="member-relation">{member.relation}</p>
                      {member.email && (
                        <p className="member-email">{member.email}</p>
                      )}
                      {member.phone && (
                        <p className="member-phone">{member.phone}</p>
                      )}
                      {member.uid && (
                        <p style={{ color: '#48bb78', fontWeight: 500 }}>Linked User</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Add/Edit Member Modal */}
      <Modal
        title={editingMember ? 'Edit Family Member' : 'Add Family Member'}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name!' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            name="relation"
            label="Relation"
            rules={[{ required: true, message: 'Please select relation!' }]}
          >
            <Select placeholder="Select relation">
              <Option value="spouse">Spouse</Option>
              <Option value="child">Child</Option>
              <Option value="parent">Parent</Option>
              <Option value="sibling">Sibling</Option>
              <Option value="roommate">Roommate</Option>
              <Option value="friend">Friend</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email (Optional)"
            rules={[
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone (Optional)"
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>

          {inviteNeeded && inviteEmail && (
            <div style={{ marginBottom: 16 }}>
              <Button
                type="dashed"
                onClick={() => {
                  toast.info(`Invitation sent to ${inviteEmail} (simulated)`);
                  setInviteNeeded(false);
                  setInviteEmail("");
                }}
                block
              >
                Invite {inviteEmail} to join the app
              </Button>
              <p style={{ color: '#f59e0b', marginTop: 8 }}>
                This person is not registered yet. Invite them to join and their account will be linked automatically when they sign up.
              </p>
            </div>
          )}

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
            >
              {editingMember ? 'Update Member' : 'Add Member'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default FamilyMembers; 