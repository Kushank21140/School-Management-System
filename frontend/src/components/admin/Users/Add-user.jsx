import React, { useState } from 'react';
import './Add-user.css';
import Navbar from '../../common/Navbar';

import {
    Box
} from '@mui/material';

const AddUser = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        parentName: '',
        parentEmail: '',
        parentMobile: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear parent fields when role changes from student to something else
        if (name === 'role' && value !== 'student') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                parentName: '',
                parentEmail: '',
                parentMobile: ''
            }));
            // Clear parent field errors
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.parentEmail;
                delete newErrors.parentMobile;
                return newErrors;
            });
        }

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // Clear success message when form is modified
        if (successMessage) {
            setSuccessMessage('');
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Required fields validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 4) {
            newErrors.password = 'Password must be at least 4 characters';
        }

        if (!formData.role) {
            newErrors.role = 'Role is required';
        }

        // Parent email validation (only if role is student and field is provided)
        if (formData.role === 'student' && formData.parentEmail && !/\S+@\S+\.\S+/.test(formData.parentEmail)) {
            newErrors.parentEmail = 'Parent email is invalid';
        }

        // Parent mobile validation (only if role is student and field is provided)
        if (formData.role === 'student' && formData.parentMobile && !/^\d{10}$/.test(formData.parentMobile.replace(/\D/g, ''))) {
            newErrors.parentMobile = 'Parent mobile should be 10 digits';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            // Prepare data for submission
            const submitData = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: formData.role
            };

            // Add parent fields only if role is student and they have values
            if (formData.role === 'student') {
                if (formData.parentName.trim()) {
                    submitData.parentName = formData.parentName.trim();
                }
                if (formData.parentEmail.trim()) {
                    submitData.parentEmail = formData.parentEmail.trim().toLowerCase();
                }
                if (formData.parentMobile.trim()) {
                    submitData.parentMobile = formData.parentMobile.trim();
                }
            }

            const response = await fetch('http://localhost:5000/api/admin/add-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(submitData)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('User created successfully!');
                // Reset form
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: '',
                    parentName: '',
                    parentEmail: '',
                    parentMobile: ''
                });
            } else {
                setErrors({ submit: data.error || 'Failed to create user' });
            }
        } catch (error) {
            setErrors({ submit: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: '',
            parentName: '',
            parentEmail: '',
            parentMobile: ''
        });
        setErrors({});
        setSuccessMessage('');
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Navbar />

            <br></br>

            <div className="add-user-container">
                <div className="add-user-header">
                    <h2>Add New User</h2>
                    <p>Create a new user account for the school management system</p>
                </div>

                <form onSubmit={handleSubmit} className="add-user-form">
                    {/* Success Message */}
                    {successMessage && (
                        <div className="success-message">
                            {successMessage}
                        </div>
                    )}

                    {/* Submit Error */}
                    {errors.submit && (
                        <div className="error-message">
                            {errors.submit}
                        </div>
                    )}

                    {/* Basic Information Section */}
                    <div className="form-section">
                        <h3>Basic Information</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">
                                    Full Name <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={errors.name ? 'error' : ''}
                                    placeholder="Enter full name"
                                />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="role">
                                    Role <span className="required">*</span>
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className={errors.role ? 'error' : ''}
                                >
                                    <option value="">Select Role</option>
                                    <option value="admin">Admin</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="student">Student</option>
                                </select>
                                {errors.role && <span className="error-text">{errors.role}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="email">
                                    Email Address <span className="required">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={errors.email ? 'error' : ''}
                                    placeholder="Enter email address"
                                />
                                {errors.email && <span className="error-text">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">
                                    Password <span className="required">*</span>
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={errors.password ? 'error' : ''}
                                    placeholder="Enter password (min 4 characters)"
                                />
                                {errors.password && <span className="error-text">{errors.password}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Parent Information Section - Only show when role is 'student' */}
                    {formData.role === 'student' && (
                        <div className="form-section">
                            <h3>Parent/Guardian Information <span className="optional">(Optional)</span></h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="parentName">Parent/Guardian Name</label>
                                    <input
                                        type="text"
                                        id="parentName"
                                        name="parentName"
                                        value={formData.parentName}
                                        onChange={handleChange}
                                        placeholder="Enter parent/guardian name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="parentEmail">Parent Email</label>
                                    <input
                                        type="email"
                                        id="parentEmail"
                                        name="parentEmail"
                                        value={formData.parentEmail}
                                        onChange={handleChange}
                                        className={errors.parentEmail ? 'error' : ''}
                                        placeholder="Enter parent email"
                                    />
                                    {errors.parentEmail && <span className="error-text">{errors.parentEmail}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="parentMobile">Parent Mobile</label>
                                    <input
                                        type="tel"
                                        id="parentMobile"
                                        name="parentMobile"
                                        value={formData.parentMobile}
                                        onChange={handleChange}
                                        className={errors.parentMobile ? 'error' : ''}
                                        placeholder="Enter parent mobile number"
                                    />
                                    {errors.parentMobile && <span className="error-text">{errors.parentMobile}</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creating User...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </Box>
    );
};

export default AddUser;
