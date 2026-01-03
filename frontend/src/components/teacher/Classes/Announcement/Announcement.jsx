import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Announcement.css';
import { Box, Container } from '@mui/material';
import Navbar from '../../../common/Navbar';

function Announcement() {
    const navigate = useNavigate();
    const location = useLocation();

    // Extract data from location state
    const className = location.state?.className;
    const passedClassData = location.state?.classData;
    const passedClassId = location.state?.classId;

    // State variables
    const [announcements, setAnnouncements] = useState([]);
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [classInfo, setClassInfo] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [currentClass, setCurrentClass] = useState(null);
    const [classId, setClassId] = useState(passedClassId || null);

    // Search and filter states - Updated for multiple selection with dropdown
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState([]);
    const [filterPriority, setFilterPriority] = useState([]);

    // Dropdown visibility states
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

    // Refs for dropdown management
    const statusDropdownRef = useRef(null);
    const priorityDropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        priority: 'normal',
        expiryDate: '',
        expiryTime: '',
        attachments: []
    });
    const [editingId, setEditingId] = useState(null);

    // Status and Priority options
    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'expired', label: 'Expired' }
    ];

    const priorityOptions = [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'normal', label: 'Normal' }
    ];

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setShowStatusDropdown(false);
            }
            if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
                setShowPriorityDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Helper function to check if announcement is expired
    const isExpired = (expiryDate) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

       // Filter and search announcements 
    useEffect(() => {
        let filtered = [...announcements];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(announcement =>
                announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter - must match at least one selected status
        if (filterStatus.length > 0) {
            filtered = filtered.filter(announcement => {
                return filterStatus.some(status => {
                    if (status === 'expired') {
                        return isExpired(announcement.expiryDate);
                    }
                    return announcement.status === status;
                });
            });
        }

        // Priority filter - must match at least one selected priority
        if (filterPriority.length > 0) {
            filtered = filtered.filter(announcement => 
                filterPriority.includes(announcement.priority)
            );
        }

        setFilteredAnnouncements(filtered);
    }, [announcements, searchTerm, filterStatus, filterPriority]);


    // Initialize class data from location state
    useEffect(() => {
        if (passedClassData && passedClassData.length > 0) {
            const classData = passedClassData[0];
            setCurrentClass(classData);
            setClassInfo(classData);
            setClassId(classData._id);
        } else if (passedClassData && !Array.isArray(passedClassData)) {
            setCurrentClass(passedClassData);
            setClassInfo(passedClassData);
            setClassId(passedClassData._id);
        } else if (passedClassId) {
            setClassId(passedClassId);
        } else if (!className && !passedClassId) {
            navigate('/teacher/classes');
            return;
        }
    }, [passedClassData, passedClassId, className, navigate]);

    // Fetch class information and announcements when classId is available
    useEffect(() => {
        if (classId) {
            if (!classInfo) {
                fetchClassInfo();
            }
            fetchAnnouncements();
        }
    }, [classId]);

    const fetchClassInfo = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/classes/${classId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.length > 0) {
                    const classData = data.data[0];
                    setClassInfo(classData);
                    setCurrentClass(classData);
                }
            } else if (response.status === 403) {
                setMessage({ type: 'error', text: 'Access denied to this class' });
                setTimeout(() => navigate('/teacher/classes'), 2000);
            }
        } catch (error) {
            console.error('Error fetching class info:', error);
            setMessage({ type: 'error', text: 'Error fetching class information' });
        }
    };

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/announcements/class/${classId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAnnouncements(data.data.announcements || []);
            } else if (response.status === 403) {
                setMessage({ type: 'error', text: 'Access denied to this class' });
                setTimeout(() => navigate('/teacher/classes'), 2000);
            } else {
                const errorData = await response.json();
                setMessage({ type: 'error', text: errorData.message || 'Error fetching announcements' });
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setMessage({ type: 'error', text: 'Error fetching announcements' });
        } finally {
            setLoading(false);
        }
    };

    // Handle back to class home
    const handleBackToClass = () => {
        var classData = currentClass || classInfo;
        const cname = classData['name']
        const classroutename = cname.replace(/\s+/g, '-').toLowerCase();

        navigate(`/teacher/class/${classroutename}`, {
            state: {
                className: classData['name']
            }
        });
    };

    // Handle status filter changes
    const handleStatusFilterChange = (status) => {
        setFilterStatus(prev => {
            if (prev.includes(status)) {
                return prev.filter(s => s !== status);
            } else {
                return [...prev, status];
            }
        });
    };

    // Handle priority filter changes
    const handlePriorityFilterChange = (priority) => {
        setFilterPriority(prev => {
            if (prev.includes(priority)) {
                return prev.filter(p => p !== priority);
            } else {
                return [...prev, priority];
            }
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setFilterStatus([]);
        setFilterPriority([]);
    };

    // Get display text for dropdown
    const getStatusDisplayText = () => {
        if (filterStatus.length === 0) return 'Select Status';
        if (filterStatus.length === 1) return statusOptions.find(opt => opt.value === filterStatus[0])?.label;
        return `${filterStatus.length} selected`;
    };

    const getPriorityDisplayText = () => {
        if (filterPriority.length === 0) return 'Select Priority';
        if (filterPriority.length === 1) return priorityOptions.find(opt => opt.value === filterPriority[0])?.label;
        return `${filterPriority.length} selected`;
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({
            ...prev,
            attachments: files
        }));
    };

    // Helper function to combine date and time
    const combineDateTime = (date, time) => {
        if (!date) return null;

        try {
            let combinedDateTime;

            if (time) {
                combinedDateTime = new Date(`${date}T${time}:00`);
            } else {
                combinedDateTime = new Date(`${date}T23:59:59`);
            }

            if (isNaN(combinedDateTime.getTime())) {
                return null;
            }

            return combinedDateTime.toISOString();
        } catch (error) {
            console.error('Error combining date/time:', error);
            return null;
        }
    };

    // Helper function to extract date and time from datetime string
    const extractDateTime = (dateTimeString) => {
        if (!dateTimeString) return { date: '', time: '' };

        try {
            const dateTime = new Date(dateTimeString);

            if (isNaN(dateTime.getTime())) {
                return { date: '', time: '' };
            }

            const year = dateTime.getFullYear();
            const month = String(dateTime.getMonth() + 1).padStart(2, '0');
            const day = String(dateTime.getDate()).padStart(2, '0');
            const date = `${year}-${month}-${day}`;

            const hours = String(dateTime.getHours()).padStart(2, '0');
            const minutes = String(dateTime.getMinutes()).padStart(2, '0');
            const time = `${hours}:${minutes}`;

            return { date, time };
        } catch (error) {
            console.error('Error extracting date/time:', error);
            return { date: '', time: '' };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('content', formData.content);
            formDataToSend.append('priority', formData.priority);
            formDataToSend.append('classId', classId);

            if (formData.expiryDate) {
                const combinedDateTime = combineDateTime(formData.expiryDate, formData.expiryTime);
                if (combinedDateTime) {
                    formDataToSend.append('expiryDate', combinedDateTime);
                }
            }

            formData.attachments.forEach(file => {
                formDataToSend.append('attachments', file);
            });

            const url = editingId
                ? `http://localhost:5000/api/announcements/${editingId}`
                : 'http://localhost:5000/api/announcements';

            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formDataToSend
            });

            if (response.ok) {
                const data = await response.json();

                if (editingId) {
                    const existingAnnouncement = announcements.find(a => a._id === editingId);
                    const updatedAnnouncement = {
                        ...data.data,
                        teacherId: data.data.teacherId || existingAnnouncement.teacherId
                    };

                    setAnnouncements(prev => prev.map(announcement =>
                        announcement._id === editingId ? updatedAnnouncement : announcement
                    ));
                    showMessage('success', 'Announcement updated successfully');
                } else {
                    const newAnnouncement = {
                        ...data.data,
                        teacherId: data.data.teacherId || {
                            name: localStorage.getItem('userName') || 'Current User'
                        }
                    };
                    setAnnouncements(prev => [newAnnouncement, ...prev]);
                    showMessage('success', 'Announcement created successfully');
                }

                setFormData({
                    title: '',
                    content: '',
                    priority: 'normal',
                    expiryDate: '',
                    expiryTime: '',
                    attachments: []
                });
                setEditingId(null);
                setShowCreateForm(false);
            } else {
                const errorData = await response.json();
                showMessage('error', errorData.message || 'Error saving announcement');
            }
        } catch (error) {
            console.error('Error saving announcement:', error);
            showMessage('error', 'Error saving announcement');
        }
    };

    const handleToggleStatus = async (id) => {
        const announcement = announcements.find(a => a._id === id);

        if (isExpired(announcement?.expiryDate)) {
            showMessage('error', 'Cannot change status of expired announcements');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/announcements/${id}/toggle-status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                const existingAnnouncement = announcements.find(a => a._id === id);
                const updatedAnnouncement = {
                    ...data.data,
                    teacherId: data.data.teacherId || existingAnnouncement.teacherId
                };

                setAnnouncements(prev => prev.map(announcement =>
                    announcement._id === id ? updatedAnnouncement : announcement
                ));
                showMessage('success', 'Announcement status updated successfully');
            } else {
                const errorData = await response.json();
                showMessage('error', errorData.message || 'Error updating announcement status');
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            showMessage('error', 'Error updating announcement status');
        }
    };

    const handleEdit = (announcement) => {
        if (isExpired(announcement.expiryDate)) {
            showMessage('error', 'Cannot edit expired announcements');
            return;
        }

        const { date, time } = extractDateTime(announcement.expiryDate);

        setFormData({
            title: announcement.title,
            content: announcement.content,
            priority: announcement.priority,
            expiryDate: date,
            expiryTime: time,
            attachments: []
        });
        setEditingId(announcement._id);
        setShowCreateForm(true);
    };

    const handleDelete = async (id) => {
        const announcement = announcements.find(a => a._id === id);

        if (isExpired(announcement?.expiryDate)) {
            showMessage('error', 'Cannot delete expired announcements');
            return;
        }

        if (window.confirm('Are you sure you want to delete this announcement?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/announcements/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    setAnnouncements(prev => prev.filter(announcement => announcement._id !== id));
                    showMessage('success', 'Announcement deleted successfully');
                } else {
                    const errorData = await response.json();
                    showMessage('error', errorData.message || 'Error deleting announcement');
                }
            } catch (error) {
                console.error('Error deleting announcement:', error);
                showMessage('error', 'Error deleting announcement');
            }
        }
    };

    const cancelEdit = () => {
        setFormData({
            title: '',
            content: '',
            priority: 'normal',
            expiryDate: '',
            expiryTime: '',
            attachments: []
        });
        setEditingId(null);
        setShowCreateForm(false);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#ff4757';
            case 'medium': return '#ffa502';
            case 'normal': return '#2ed573';
            default: return '#747d8c';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCurrentDateTime = () => {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().slice(0, 5);
        return { date, time };
    };

    const { date: currentDate, time: currentTime } = getCurrentDateTime();

    if (loading) {
        return (
            <Box sx={{ flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Navbar />
                <div className="loading">Loading announcements...</div>
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Navbar />
            <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
                <div className="announcement-container">
                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="announcement-top-bar">
                        <button
                            className="btn btn-back"
                            onClick={handleBackToClass}
                            title="Back to Class Home"
                        >
                            ← Back to Class
                        </button>
                    </div>

                    <div className="announcement-header">
                        <div className="class-context">
                            <h2>Class Announcements</h2>
                            {(classInfo || currentClass) && (
                                <div className="class-info">
                                    <span className="class-name">
                                        {classInfo?.name || currentClass?.name || className}
                                    </span>
                                    <span className="class-details">
                                        {(classInfo?.subject || currentClass?.subject)} • {(classInfo?.students?.length || currentClass?.students?.length || 0)} students
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateForm(true)}
                        >
                            + New Announcement
                        </button>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="search-filter-section">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search announcements by title or content..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <span className="search-icon">🔍</span>
                        </div>

                        <div className="filter-controls">
                            {/* Status Filter - Custom Multi-select Dropdown */}
                            <div className="filter-group" ref={statusDropdownRef}>
                                <label>Status:</label>
                                <div className="custom-dropdown">
                                    <button
                                        type="button"
                                        className="dropdown-toggle"
                                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    >
                                        {getStatusDisplayText()}
                                        <span className={`dropdown-arrow ${showStatusDropdown ? 'open' : ''}`}>▼</span>
                                    </button>
                                    {showStatusDropdown && (
                                        <div className="dropdown-menu">
                                            {statusOptions.map(option => (
                                                <label key={option.value} className="dropdown-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={filterStatus.includes(option.value)}
                                                        onChange={() => handleStatusFilterChange(option.value)}
                                                    />
                                                    <span className="checkbox-label">{option.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Priority Filter - Custom Multi-select Dropdown */}
                            <div className="filter-group" ref={priorityDropdownRef}>
                                <label>Priority:</label>
                                <div className="custom-dropdown">
                                    <button
                                        type="button"
                                        className="dropdown-toggle"
                                        onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                                    >
                                        {getPriorityDisplayText()}
                                        <span className={`dropdown-arrow ${showPriorityDropdown ? 'open' : ''}`}>▼</span>
                                    </button>
                                    {showPriorityDropdown && (
                                        <div className="dropdown-menu">
                                            {priorityOptions.map(option => (
                                                <label key={option.value} className="dropdown-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={filterPriority.includes(option.value)}
                                                        onChange={() => handlePriorityFilterChange(option.value)}
                                                    />
                                                    <span className="checkbox-label">{option.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                className="btn btn-clear-filters"
                                onClick={clearFilters}
                                title="Clear all filters"
                            >
                                Clear Filters
                            </button>
                        </div>

                        <div className="results-info">
                            Showing {filteredAnnouncements.length} of {announcements.length} announcements
                            {filterStatus.length > 0 && (
                                <span className="active-filters">
                                    • Status: {filterStatus.map(s => statusOptions.find(opt => opt.value === s)?.label).join(', ')}
                                </span>
                            )}
                            {filterPriority.length > 0 && (
                                <span className="active-filters">
                                    • Priority: {filterPriority.map(p => priorityOptions.find(opt => opt.value === p)?.label).join(', ')}
                                </span>
                            )}
                        </div>
                    </div>

                    {showCreateForm && (
                        <div className="announcement-form-overlay">
                            <div className="announcement-form">
                                <h3>
                                    {editingId ? 'Edit Announcement' : 'Create New Announcement'}
                                    {(classInfo || currentClass) && (
                                        <span className="form-class-context">
                                            {' '}for {classInfo?.name || currentClass?.name || className}
                                        </span>
                                    )}
                                </h3>
                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label htmlFor="title">Title *</label>
                                        <input
                                            type="text"
                                            id="title"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Enter announcement title"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="content">Content *</label>
                                        <textarea
                                            id="content"
                                            name="content"
                                            value={formData.content}
                                            onChange={handleInputChange}
                                            required
                                            rows="4"
                                            placeholder="Enter announcement content"
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="priority">Priority</label>
                                            <select
                                                id="priority"
                                                name="priority"
                                                value={formData.priority}
                                                onChange={handleInputChange}
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="expiryDate">Expiry Date</label>
                                            <input
                                                type="date"
                                                id="expiryDate"
                                                name="expiryDate"
                                                value={formData.expiryDate}
                                                onChange={handleInputChange}
                                                min={currentDate}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="expiryTime">Expiry Time</label>
                                            <input
                                                type="time"
                                                id="expiryTime"
                                                name="expiryTime"
                                                value={formData.expiryTime}
                                                onChange={handleInputChange}
                                                min={formData.expiryDate === currentDate ? currentTime : undefined}
                                            />
                                            <small className="time-help">
                                                {formData.expiryDate
                                                    ? "Set specific time, or leave empty for end of day (11:59 PM)"
                                                    : "Select expiry date first, or leave both empty for no expiration"
                                                }
                                            </small>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="attachments">Attachments</label>
                                        <input
                                            type="file"
                                            id="attachments"
                                            name="attachments"
                                            onChange={handleFileChange}
                                            multiple
                                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                                        />
                                        <small className="file-help">
                                            Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 10MB each)
                                        </small>
                                    </div>

                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {editingId ? 'Update' : 'Create'} Announcement
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="announcements-list">
                        {filteredAnnouncements.length === 0 ? (
                            <div className="no-announcements">
                                {announcements.length === 0 ? (
                                    <>
                                        <p>No announcements yet for this class.</p>
                                        <p>Create your first announcement to get started!</p>
                                    </>
                                ) : (
                                    <>
                                        <p>No announcements match your search criteria.</p>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={clearFilters}
                                        >
                                            Clear Filters
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            filteredAnnouncements.map(announcement => {
                                const expired = isExpired(announcement.expiryDate);
                                return (
                                    <div
                                        key={announcement._id}
                                        className={`announcement-card ${announcement.status} ${expired ? 'expired' : ''}`}
                                    >
                                        <div className="announcement-header-card">
                                            <div className="announcement-title-section">
                                                <h3>
                                                    {announcement.title}
                                                    {expired && <span className="expired-indicator">⏰ EXPIRED</span>}
                                                </h3>
                                                <div className="announcement-meta">
                                                    <span
                                                        className="priority-badge"
                                                        style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                                                    >
                                                        {announcement.priority.toUpperCase()}
                                                    </span>
                                                                                                   <span className={`status-badge ${announcement.status} ${expired ? 'expired' : ''}`}>
                                                        {expired ? 'EXPIRED' : announcement.status.toUpperCase()}
                                                    </span>
                                                    {announcement.readBy && (
                                                        <span className="read-count">
                                                            {announcement.readBy.length} read
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="announcement-actions">
                                                <button
                                                    className={`btn-icon ${expired ? 'disabled' : ''}`}
                                                    onClick={() => !expired && handleEdit(announcement)}
                                                    title={expired ? 'Cannot edit expired announcement' : 'Edit'}
                                                    disabled={expired}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className={`btn-icon ${expired ? 'disabled' : ''}`}
                                                    onClick={() => !expired && handleToggleStatus(announcement._id)}
                                                    title={expired ? 'Cannot change status of expired announcement' : (announcement.status === 'active' ? 'Deactivate' : 'Activate')}
                                                    disabled={expired}
                                                >
                                                    {announcement.status === 'active' ? '⏸️' : '▶️'}
                                                </button>
                                                <button
                                                    className={`btn-icon delete ${expired ? 'disabled' : ''}`}
                                                    onClick={() => !expired && handleDelete(announcement._id)}
                                                    title={expired ? 'Cannot delete expired announcement' : 'Delete'}
                                                    disabled={expired}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`announcement-content ${expired ? 'expired' : ''}`}>
                                            <p>{announcement.content}</p>

                                            {announcement.attachments && announcement.attachments.length > 0 && (
                                                <div className="attachments">
                                                    <h4>Attachments:</h4>
                                                    <div className="attachment-list">
                                                        {announcement.attachments.map((attachment, index) => (
                                                            <a
                                                                key={index}
                                                                href={`http://localhost:5000${attachment.url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="attachment-link"
                                                            >
                                                                📎 {attachment.originalName}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="announcement-footer">
                                            <span className="created-date">
                                                Created: {formatDate(announcement.createdAt)}
                                            </span>
                                            {announcement.expiryDate && (
                                                <span className={`expiry-date ${expired ? 'expired' : ''}`}>
                                                    {expired ? 'Expired' : 'Expires'}: {formatDate(announcement.expiryDate)}
                                                </span>
                                            )}
                                            {announcement.teacherId && (
                                                <span className="teacher-name">
                                                    By: {announcement.teacherId.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </Container>
        </Box>
    );
}

export default Announcement;
