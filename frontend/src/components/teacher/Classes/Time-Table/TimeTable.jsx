import React, { useState, useEffect } from 'react';
import { Plus, Clock, MapPin, User, Edit, Trash2, Calendar, Settings, BookOpen, ArrowLeft, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../../common/Navbar';
import './TimeTable.css';
import { Box, Chip, Typography } from '@mui/material';

const Timetable = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [showTimeSlotManager, setShowTimeSlotManager] = useState(false);
    const [customTimeSlots, setCustomTimeSlots] = useState([]);
    const [customDays, setCustomDays] = useState([]);
    const [error, setError] = useState('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState({ day: '', time: '' });

    const location = useLocation();
    const navigate = useNavigate();
    const classDetails = location.state?.classDetails;
    const classId = location.state?.classId;
    const className = location.state?.className;
    const classData = location.state?.classData?.[0]; // Get full class data

    useEffect(() => {
        if (classId || classData) {
            fetchTimetable();
            loadCustomSettings();
        }
    }, [classId, classData]);

    const loadCustomSettings = () => {
        const savedTimeSlots = localStorage.getItem('customTimeSlots');
        const savedDays = localStorage.getItem('customDays');

        if (savedTimeSlots) {
            setCustomTimeSlots(JSON.parse(savedTimeSlots));
        }
        if (savedDays) {
            setCustomDays(JSON.parse(savedDays));
        }
    };

    const saveCustomSettings = (timeSlots, days) => {
        localStorage.setItem('customTimeSlots', JSON.stringify(timeSlots));
        localStorage.setItem('customDays', JSON.stringify(days));
        setCustomTimeSlots(timeSlots);
        setCustomDays(days);
    };

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const currentClassId = classId || classData?._id;
            const queryParams = currentClassId ? `?classId=${currentClassId}` : '';

            const response = await fetch(`http://localhost:5000/api/teacher/timetable${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
            });

            const result = await response.json();

            if (result.success) {
                setClasses(result.data);
                setError('');
            } else {
                setError(result.error || 'Failed to fetch timetable');
                setClasses([]);
            }
        } catch (error) {
            console.error('Error fetching timetable:', error);
            setError('Failed to fetch timetable');
            setClasses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddClass = (day = '', time = '') => {
        setSelectedTimeSlot({ day, time });
        setEditingClass(null);
        setShowAddForm(true);
    };

    const handleEditClass = (classItem) => {
        setEditingClass(classItem);
        setSelectedTimeSlot({ day: classItem.day, time: classItem.time });
        setShowAddForm(true);
    };

    const handleDeleteClass = async (id) => {
        if (window.confirm('Are you sure you want to delete this class?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/teacher/timetable/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                });

                const result = await response.json();

                if (result.success) {
                    fetchTimetable();
                    setError('');
                } else {
                    setError(result.error || 'Failed to delete class');
                }
            } catch (error) {
                console.error('Error deleting class:', error);
                setError('Failed to delete class');
            }
        }
    };

    const handleBackToClasses = () => {
        navigate(-1);
    };

    const getClassForSlot = (day, time) => {
        return classes.find(c => c.day === day && c.time === time);
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <Navbar />
                <div className="dashboard-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading timetable...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Navbar />
            <div className="dashboard-content">
                <div className="timetable-page">
                    <button
                        onClick={handleBackToClasses}
                        className="btn btn-back"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Classes</span>
                    </button>
                    <div className="timetable-header">

                        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2', mb: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Users size={32} />
                                Time Table
                                {className && <Chip label={className || classData?.name} color="primary" variant="outlined" />}
                            </Box>
                        </Typography>

                        {error && (
                            <div className="error-alert">
                                <div className="error-content">
                                    <span className="error-icon">⚠️</span>
                                    <span className="error-text">{error}</span>
                                </div>
                            </div>
                        )}

                        <div className="header-actions">
                            <button
                                onClick={() => setShowTimeSlotManager(true)}
                                className="btn btn-secondary"
                            >
                                <Settings size={16} />
                                <span className="btn-text">Manage Schedule</span>
                            </button>
                            <button
                                onClick={() => handleAddClass()}
                                className="btn btn-primary"
                            >
                                <Plus size={16} />
                                <span className="btn-text">Add Class</span>
                            </button>
                        </div>
                    </div>

                    <div className="timetable-wrapper">
                        <div className="timetable-scroll">
                            <table className="timetable-table">
                                <thead>
                                    <tr>
                                        <th >
                                            <Clock size={16} className="mr-2" />
                                            <span>Time</span>
                                        </th>
                                        {customDays.map(day => (
                                            <th key={day} className="day-header-cell">{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="table-body">
                                    {customTimeSlots.map(time => (
                                        <tr key={time} className="table-row">
                                            <td className="time-cell">
                                                <div className="time-slot">
                                                    {time}
                                                </div>
                                            </td>
                                            {customDays.map(day => {
                                                const classItem = getClassForSlot(day, time);
                                                return (
                                                    <td key={`${day}-${time}`} className="class-cell">
                                                        {classItem ? (
                                                            <div className="class-card">
                                                                <div className="class-header">
                                                                    <div className="class-subject">
                                                                        <BookOpen size={14} />
                                                                        <span>{classItem.subject}</span>
                                                                    </div>
                                                                    <div className="class-actions">
                                                                        <button
                                                                            onClick={() => handleEditClass(classItem)}
                                                                            className="action-btn edit-btn"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit size={12} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteClass(classItem.id)}
                                                                            className="action-btn delete-btn"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="class-details">
                                                                    <div className="class-info">
                                                                        <User size={12} />
                                                                        <span>{classItem.teacher}</span>
                                                                    </div>
                                                                    <div className="class-info">
                                                                        <MapPin size={12} />
                                                                        <span>{classItem.room}</span>
                                                                    </div>
                                                                    {classItem.class && (
                                                                        <div className="class-info">
                                                                            <Calendar size={12} />
                                                                            <span>{classItem.class}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                className="empty-slot"
                                                                onClick={() => handleAddClass(day, time)}
                                                            >
                                                                <Plus size={16} className="empty-slot-icon" />
                                                                <span className="empty-slot-text">Add Class</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {showAddForm && (
                            <ClassForm
                                editingClass={editingClass}
                                onClose={() => setShowAddForm(false)}
                                onSubmit={fetchTimetable}
                                availableDays={customDays}
                                availableTimeSlots={customTimeSlots}
                                currentClassData={classData || classDetails}
                                currentClassId={classId || classData?._id}
                                selectedTimeSlot={selectedTimeSlot}
                            />
                        )}

                        {showTimeSlotManager && (
                            <TimeSlotManager
                                timeSlots={customTimeSlots}
                                days={customDays}
                                onClose={() => setShowTimeSlotManager(false)}
                                onSave={saveCustomSettings}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ClassForm = ({
    editingClass,
    onClose,
    onSubmit,
    availableDays,
    availableTimeSlots,
    currentClassData,
    currentClassId,
    selectedTimeSlot
}) => {
    const [formData, setFormData] = useState({
        subject: editingClass?.subject || '',
        room: editingClass?.room || '',
        time: editingClass?.time || selectedTimeSlot.time || '',
        day: editingClass?.day || selectedTimeSlot.day || '',
        classId: editingClass?.classId || currentClassId || '',
        notes: editingClass?.notes || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Get subjects from current class data
    const availableSubjects = currentClassData?.subjects || [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const url = editingClass
                ? `http://localhost:5000/api/teacher/timetable/${editingClass.id}`
                : 'http://localhost:5000/api/teacher/timetable';

            const method = editingClass ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                onSubmit();
                onClose();
            } else {
                setError(result.error || 'Failed to save class');
            }
        } catch (error) {
            console.error('Error saving class:', error);
            setError('Failed to save class');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content class-form-modal">
                <div className="modal-header">
                    <h2 className="modal-title">
                        {editingClass ? 'Edit Class' : 'Add New Class'}
                    </h2>
                    <button onClick={onClose} className="modal-close-btn">×</button>
                </div>

                {error && (
                    <div className="error-alert">
                        <div className="error-content">
                            <span className="error-icon">⚠️</span>
                            <span className="error-text">{error}</span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="class-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Subject *</label>
                            {availableSubjects.length > 0 ? (
                                <select
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="form-input"
                                    required
                                    disabled={loading}
                                >
                                    <option value="">Select Subject</option>
                                    {availableSubjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="form-input"
                                    placeholder="Enter subject name"
                                    required
                                    disabled={loading}
                                />
                            )}
                            {availableSubjects.length === 0 && (
                                <small className="form-help">No subjects defined for this class. You can enter manually.</small>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Room *</label>
                            <input
                                type="text"
                                value={formData.room}
                                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                className="form-input"
                                placeholder="e.g., Room 101, Lab A"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Day *</label>
                            <select
                                value={formData.day}
                                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                                className="form-input"
                                required
                                disabled={loading}
                            >
                                <option value="">Select Day</option>
                                {availableDays.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Time *</label>
                            <select
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                className="form-input"
                                required
                                disabled={loading}
                            >
                                <option value="">Select Time</option>
                                {availableTimeSlots.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (Optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="form-input"
                            placeholder="Additional notes or instructions"
                            rows="3"
                            disabled={loading}
                        />
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-cancel"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="btn-spinner"></div>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>{editingClass ? 'Update' : 'Add'} Class</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TimeSlotManager = ({
    timeSlots,
    days,
    onClose,
    onSave
}) => {
    const [newTimeSlots, setNewTimeSlots] = useState([...timeSlots]);
    const [newDays, setNewDays] = useState([...days]);
    const [newTimeSlot, setNewTimeSlot] = useState('');
    const [newDay, setNewDay] = useState('');

    const addTimeSlot = () => {
        if (newTimeSlot.trim() && !newTimeSlots.includes(newTimeSlot.trim())) {
            setNewTimeSlots([...newTimeSlots, newTimeSlot.trim()]);
            setNewTimeSlot('');
        }
    };

    const removeTimeSlot = (index) => {
        setNewTimeSlots(newTimeSlots.filter((_, i) => i !== index));
    };

    const addDay = () => {
        if (newDay.trim() && !newDays.includes(newDay.trim())) {
            setNewDays([...newDays, newDay.trim()]);
            setNewDay('');
        }
    };

    const removeDay = (index) => {
        setNewDays(newDays.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        onSave(newTimeSlots, newDays);
        onClose();
    };

    const generateTimeSlot = () => {
        const startTime = document.getElementById('startTime');
        const endTime = document.getElementById('endTime');

        if (startTime.value && endTime.value) {
            const timeSlot = `${startTime.value} - ${endTime.value}`;
            setNewTimeSlot(timeSlot);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content time-manager-modal">
                <div className="modal-header">
                    <h2 className="modal-title">
                        <Settings size={20} />
                        Manage Schedule Settings
                    </h2>
                    <button onClick={onClose} className="modal-close-btn">×</button>
                </div>

                <div className="time-manager-content">
                    <div className="time-manager-grid">
                        {/* Time Slots Management */}
                        <div className="manager-section">
                            <h3 className="section-title">
                                <Clock size={18} />
                                Time Slots
                            </h3>

                            {/* Time Slot Generator */}
                            <div className="time-generator">
                                <h4 className="generator-title">Quick Time Slot Generator</h4>
                                <div className="time-inputs">
                                    <div className="time-input-group">
                                        <label>Start Time</label>
                                        <input
                                            id="startTime"
                                            type="time"
                                            className="time-input"
                                        />
                                    </div>
                                    <div className="time-input-group">
                                        <label>End Time</label>
                                        <input
                                            id="endTime"
                                            type="time"
                                            className="time-input"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={generateTimeSlot}
                                    className="btn-generate"
                                    type="button"
                                >
                                    Generate Time Slot
                                </button>
                            </div>

                            <div className="add-input-group">
                                <input
                                    type="text"
                                    value={newTimeSlot}
                                    onChange={(e) => setNewTimeSlot(e.target.value)}
                                    placeholder="e.g., 09:00 - 10:30"
                                    className="add-input"
                                    onKeyPress={(e) => e.key === 'Enter' && addTimeSlot()}
                                />
                                <button
                                    onClick={addTimeSlot}
                                    className="btn-add"
                                    type="button"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>

                            <div className="items-list">
                                {newTimeSlots.map((slot, index) => (
                                    <div key={index} className="list-item">
                                        <div className="list-item-content">
                                            <Clock size={14} />
                                            <span className="list-item-text">{slot}</span>
                                        </div>
                                        <button
                                            onClick={() => removeTimeSlot(index)}
                                            className="btn-remove"
                                            type="button"
                                            title="Remove time slot"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {newTimeSlots.length === 0 && (
                                    <div className="empty-list">No time slots added</div>
                                )}
                            </div>
                        </div>

                        {/* Days Management */}
                        <div className="manager-section">
                            <h3 className="section-title">
                                <Calendar size={18} />
                                Days
                            </h3>

                            <div className="add-input-group">
                                <input
                                    type="text"
                                    value={newDay}
                                    onChange={(e) => setNewDay(e.target.value)}
                                    placeholder="e.g., Saturday"
                                    className="add-input"
                                    onKeyPress={(e) => e.key === 'Enter' && addDay()}
                                />
                                <button
                                    onClick={addDay}
                                    className="btn-add btn-add-day"
                                    type="button"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>

                            <div className="items-list">
                                {newDays.map((day, index) => (
                                    <div key={index} className="list-item">
                                        <div className="list-item-content">
                                            <Calendar size={14} />
                                            <span className="list-item-text">{day}</span>
                                        </div>
                                        <button
                                            onClick={() => removeDay(index)}
                                            className="btn-remove"
                                            type="button"
                                            title="Remove day"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {newDays.length === 0 && (
                                    <div className="empty-list">No days added</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        onClick={onClose}
                        className="btn btn-cancel"
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        type="button"
                    >
                        <Settings size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Timetable;
