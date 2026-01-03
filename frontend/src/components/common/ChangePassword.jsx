import React, { useState } from 'react';
import Navbar from './Navbar';
import './ChangePassword.css';

function ChangePassword() {
    const [activeTab, setActiveTab] = useState('password');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Email change state
    const [emailData, setEmailData] = useState({
        currentPassword: '',
        newEmail: '',
        confirmEmail: ''
    });

    // Handle password form changes
    const handlePasswordChange = (e) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
        setMessage({ type: '', text: '' });
    };

    // Handle email form changes
    const handleEmailChange = (e) => {
        setEmailData({
            ...emailData,
            [e.target.name]: e.target.value
        });
        setMessage({ type: '', text: '' });
    };

    // Validate password form
    const validatePasswordForm = () => {
        if (!passwordData.currentPassword) {
            setMessage({ type: 'error', text: 'Current password is required' });
            return false;
        }
        if (!passwordData.newPassword) {
            setMessage({ type: 'error', text: 'New password is required' });
            return false;
        }
        if (passwordData.newPassword.length < 4) {
            setMessage({ type: 'error', text: 'New password must be at least 4 characters long' });
            return false;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return false;
        }
        if (passwordData.currentPassword === passwordData.newPassword) {
            setMessage({ type: 'error', text: 'New password must be different from current password' });
            return false;
        }
        return true;
    };

    // Validate email form
    const validateEmailForm = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailData.currentPassword) {
            setMessage({ type: 'error', text: 'Current password is required' });
            return false;
        }
        if (!emailData.newEmail) {
            setMessage({ type: 'error', text: 'New email is required' });
            return false;
        }
        if (!emailRegex.test(emailData.newEmail)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return false;
        }
        if (emailData.newEmail !== emailData.confirmEmail) {
            setMessage({ type: 'error', text: 'Email addresses do not match' });
            return false;
        }
        return true;
    };

    // Handle password change submission
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        
        if (!validatePasswordForm()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to change password' });
            }
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    // Handle email change submission
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateEmailForm()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/auth/change-email', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: emailData.currentPassword,
                    newEmail: emailData.newEmail
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Email changed successfully!' });
                setEmailData({
                    currentPassword: '',
                    newEmail: '',
                    confirmEmail: ''
                });
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to change email' });
            }
        } catch (error) {
            console.error('Error changing email:', error);
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="change-password-page">
            {/* Add Navbar at the top */}
            <Navbar />
            
            <div className="change-password-container">
                <div className="change-password-card">
                    <h2 className="card-title">Account Settings</h2>
                    
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button 
                            className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('password');
                                setMessage({ type: '', text: '' });
                            }}
                        >
                            Change Password
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'email' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab('email');
                                setMessage({ type: '', text: '' });
                            }}
                        >
                            Change Email
                        </button>
                    </div>

                    {/* Message Display */}
                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Password Change Form */}
                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit} className="change-form">
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter your current password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter your new password"
                                    disabled={loading}
                                    required
                                    minLength="4"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Confirm your new password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="submit-button"
                                disabled={loading}
                            >
                                {loading ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </form>
                    )}

                    {/* Email Change Form */}
                    {activeTab === 'email' && (
                        <form onSubmit={handleEmailSubmit} className="change-form">
                            <div className="form-group">
                                <label htmlFor="currentPasswordEmail">Current Password</label>
                                <input
                                    type="password"
                                    id="currentPasswordEmail"
                                    name="currentPassword"
                                    value={emailData.currentPassword}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your current password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="newEmail">New Email Address</label>
                                <input
                                    type="email"
                                    id="newEmail"
                                    name="newEmail"
                                    value={emailData.newEmail}
                                    onChange={handleEmailChange}
                                    placeholder="Enter your new email address"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmEmail">Confirm New Email</label>
                                <input
                                    type="email"
                                    id="confirmEmail"
                                    name="confirmEmail"
                                    value={emailData.confirmEmail}
                                    onChange={handleEmailChange}
                                    placeholder="Confirm your new email address"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="submit-button"
                                disabled={loading}
                            >
                                {loading ? 'Changing Email...' : 'Change Email'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChangePassword;
