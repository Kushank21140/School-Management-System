import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
    Box,
    Container
} from '@mui/material';
import Navbar from '../../common/Navbar';
import './class-home.css';

function Classhome() {
    const [classes, setClasses] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableTeachers, setAvailableTeachers] = useState([]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [newSubject, setNewSubject] = useState('');
    const [updating, setUpdating] = useState(false);

    // Enhanced student management states - bulk mode is now default
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);

    // Enhanced teacher management states - bulk mode is now default
    const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
    const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
    const [selectedTeachers, setSelectedTeachers] = useState([]);
    const [showRemoveTeacherConfirm, setShowRemoveTeacherConfirm] = useState(null);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFilter, setSearchFilter] = useState('all');
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [filteredTeachers, setFilteredTeachers] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();
    const { token } = useSelector((state) => state.auth);

    const className = location.state?.className;
    const existingClassData = location.state?.classData;

    // Add this useEffect to handle scroll indicators
    useEffect(() => {
        const addScrollIndicators = () => {
            const scrollableElements = [
                '.available-students-list',
                '.available-teachers-list',
                '.students-grid',
                '.teachers-grid',
                '.subjects-list'
            ];

            scrollableElements.forEach(selector => {
                const element = document.querySelector(selector);
                if (element) {
                    const isScrollable = element.scrollHeight > element.clientHeight;
                    if (isScrollable) {
                        element.setAttribute('data-scrollable', 'true');
                    } else {
                        element.removeAttribute('data-scrollable');
                    }
                }
            });
        };

        // Add scroll indicators after component updates
        const timeoutId = setTimeout(addScrollIndicators, 100);
        return () => clearTimeout(timeoutId);
    }, [classes, availableStudents, availableTeachers, studentSearchQuery, teacherSearchQuery]);


    useEffect(() => {
        if (!className) {
            console.log('No class name provided, redirecting...');
            navigate('/admin/classes');
            return;
        }

        if (existingClassData) {
            setClasses([existingClassData]);
        } else {
            fetchClass(className);
        }

        fetchAvailableUsers();
    }, [className, existingClassData, navigate, token]);

    // Filter data based on search query
    useEffect(() => {
        if (!classes || !classes[0][0]) return;

        const query = searchQuery.toLowerCase().trim();

        if (!query) {
            setFilteredStudents(classes[0][0].students || []);
            setFilteredTeachers(classes[0][0].teachers || []);
            setFilteredSubjects(classes[0][0].subjects || []);
            return;
        }

        const students = classes[0][0].students?.filter(student =>
            student?.name?.toLowerCase().includes(query) ||
            student?.email?.toLowerCase().includes(query)
        ) || [];

        const teachers = classes[0][0].teachers?.filter(teacher =>
            teacher?.name?.toLowerCase().includes(query) ||
            teacher?.email?.toLowerCase().includes(query)
        ) || [];

        const subjects = (classes[0][0].subjects || []).filter(subject =>
            typeof subject === 'string' && subject.toLowerCase().includes(query)
        );

        setFilteredStudents(students);
        setFilteredTeachers(teachers);
        setFilteredSubjects(subjects);
    }, [searchQuery, classes]);

    const fetchClass = async (className) => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(`http://localhost:5000/api/admin/class/${className}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                console.log('Class Detail:', response.data.data);
                setClasses([response.data.data]);
            }
        } catch (error) {
            console.error('Error fetching Classes:', error);
            setError(error.response?.data?.error || 'Failed to fetch classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableUsers = async () => {
        try {
            const teachersResponse = await axios.get('http://localhost:5000/api/admin/get-teachers', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const studentsResponse = await axios.get('http://localhost:5000/api/admin/get-students', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (teachersResponse.data.success) {
                setAvailableTeachers(teachersResponse.data.data || []);
            }

            if (studentsResponse.data.success) {
                setAvailableStudents(studentsResponse.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // New unified function to add items to class
    const addToClass = async (type, ids) => {
        try {
            setUpdating(true);
            const response = await axios.post(
                'http://localhost:5000/api/admin/add-ts',
                {
                    className: className,
                    type: type,
                    ids: ids
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setClasses([response.data.data]);
                setError('');
                return true;
            }
        } catch (error) {
            console.error(`Error adding ${type}:`, error);
            setError(error.response?.data?.error || `Failed to add ${type}`);
            return false;
        } finally {
            setUpdating(false);
        }
    };

    // New unified function to remove items from class
    const removeFromClass = async (type, ids) => {
        try {
            setUpdating(true);
            const response = await axios.post(
                'http://localhost:5000/api/admin/remove-ts',
                {
                    className: className,
                    type: type,
                    ids: ids
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setClasses([response.data.data]);
                setError('');
                return true;
            }
        } catch (error) {
            console.error(`Error removing ${type}:`, error);
            setError(error.response?.data?.error || `Failed to remove ${type}`);
            return false;
        } finally {
            setUpdating(false);
        }
    };

    // Memoize available users to prevent re-renders
    // Memoize available users to prevent re-renders
    const availableStudentsForClass = useMemo(() => {
        if (!classes || !classes[0] || !classes[0][0]) return [];
        const currentStudentIds = classes[0][0].students?.map(s => s._id) || [];
        return availableStudents.filter(student =>
            !currentStudentIds.includes(student._id) &&
            (studentSearchQuery === '' ||
                student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                student.email.toLowerCase().includes(studentSearchQuery.toLowerCase()))
        );
    }, [availableStudents, classes, studentSearchQuery]);

    const availableTeachersForClass = useMemo(() => {
        if (!classes || !classes[0] || !classes[0][0]) return [];
        const currentTeacherIds = classes[0][0].teachers?.map(t => t._id) || [];
        return availableTeachers.filter(teacher =>
            !currentTeacherIds.includes(teacher._id) &&
            (teacherSearchQuery === '' ||
                teacher.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                teacher.email.toLowerCase().includes(teacherSearchQuery.toLowerCase()))
        );
    }, [availableTeachers, classes, teacherSearchQuery]);

    const handleStudentSelect = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const addStudents = async () => {
        if (selectedStudents.length === 0) return;

        const success = await addToClass('students', selectedStudents);

        if (success) {
            setSelectedStudents([]);
            setShowAddStudentModal(false);
        }
    };

    const removeStudent = async (studentId) => {
        const success = await removeFromClass('students', [studentId]);

        if (success) {
            setShowRemoveConfirm(null);
        }
    };

    const removeMultipleStudents = async (studentIds) => {
        await removeFromClass('students', studentIds);
    };

    const handleTeacherSelect = (teacherId) => {
        setSelectedTeachers(prev =>
            prev.includes(teacherId)
                ? prev.filter(id => id !== teacherId)
                : [...prev, teacherId]
        );
    };

    const addTeachers = async () => {
        if (selectedTeachers.length === 0) return;

        const success = await addToClass('teachers', selectedTeachers);

        if (success) {
            setSelectedTeachers([]);
            setShowAddTeacherModal(false);
        }
    };

    const removeTeacher = async (teacherId) => {
        const success = await removeFromClass('teachers', [teacherId]);

        if (success) {
            setShowRemoveTeacherConfirm(null);
        }
    };

    const removeMultipleTeachers = async (teacherIds) => {
        await removeFromClass('teachers', teacherIds);
    };

    // Update the subjects handling functions
    const addSubject = async () => {
        if (!newSubject.trim()) return;

        // Check if subject already exists
        const currentSubjects = classes[0][0].subjects || [];
        if (currentSubjects.includes(newSubject.trim())) {
            setError('Subject already exists in this class');
            return;
        }

        const success = await addToClass('subjects', [newSubject.trim()]);

        if (success) {
            setNewSubject('');
        }
    };

    const removeSubject = async (subjectToRemove) => {
        await removeFromClass('subjects', [subjectToRemove]);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchFilter('all');
    };

    const getSearchResultsCount = () => {
        if (!searchQuery.trim()) return null;
        const totalResults = filteredStudents.length + filteredTeachers.length + filteredSubjects.length;
        return totalResults;
    };

    // Update the AddStudentModal to show count
    const AddStudentModal = () => (
        <div className="modal-overlay" onClick={() => setShowAddStudentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Students to {className}</h3>
                    <span className="available-count">
                        {availableStudentsForClass.length} available student{availableStudentsForClass.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        className="modal-close-btn"
                        onClick={() => setShowAddStudentModal(false)}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className="student-add-controls">
                        <div className="search-input-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search available students..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="available-students-list">
                        {availableStudentsForClass.length > 0 ? (
                            availableStudentsForClass.map(student => (
                                <div
                                    key={student._id}
                                    className={`student-option ${selectedStudents.includes(student._id) ? 'selected' : ''}`}
                                    onClick={() => handleStudentSelect(student._id)}
                                >
                                    <div className="student-option-content">
                                        <div className="user-avatar">
                                            {student?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="user-details">
                                            <h4>{student?.name || 'Unknown'}</h4>
                                            <p>{student?.email || 'No email'}</p>
                                        </div>
                                        <div className="checkbox-wrapper">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(student._id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleStudentSelect(student._id);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-students-available">
                                <p>No available students found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowAddStudentModal(false)}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={addStudents}
                        disabled={selectedStudents.length === 0 || updating}
                    >
                        {updating ? 'Adding...' : `Add ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );

    // Update the AddTeacherModal to show count
    const AddTeacherModal = () => (
        <div className="modal-overlay" onClick={() => setShowAddTeacherModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Teachers to {className}</h3>
                    <span className="available-count">
                        {availableTeachersForClass.length} available teacher{availableTeachersForClass.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        className="modal-close-btn"
                        onClick={() => setShowAddTeacherModal(false)}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div className="teacher-add-controls">
                        <div className="search-input-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search available teachers..."
                                value={teacherSearchQuery}
                                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="available-teachers-list">
                        {availableTeachersForClass.length > 0 ? (
                            availableTeachersForClass.map(teacher => (
                                <div
                                    key={teacher._id}
                                    className={`teacher-option ${selectedTeachers.includes(teacher._id) ? 'selected' : ''}`}
                                    onClick={() => handleTeacherSelect(teacher._id)}
                                >
                                    <div className="teacher-option-content">
                                        <div className="user-avatar">
                                            {teacher?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="user-details">
                                            <h4>{teacher?.name || 'Unknown'}</h4>
                                            <p>{teacher?.email || 'No email'}</p>
                                        </div>
                                        <div className="checkbox-wrapper">
                                            <input
                                                type="checkbox"
                                                checked={selectedTeachers.includes(teacher._id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleTeacherSelect(teacher._id);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-teachers-available">
                                <p>No available teachers found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowAddTeacherModal(false)}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={addTeachers}
                        disabled={selectedTeachers.length === 0 || updating}
                    >
                        {updating ? 'Adding...' : `Add ${selectedTeachers.length} Teacher${selectedTeachers.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );

    // Confirmation modal for removing students
    const RemoveConfirmModal = ({ student }) => (
        <div className="modal-overlay" onClick={() => setShowRemoveConfirm(null)}>
            <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Remove Student</h3>
                </div>
                <div className="modal-body">
                    <p>Are you sure you want to remove <strong>{student?.name || 'this student'}</strong> from this class?</p>
                    <p className="warning-text">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowRemoveConfirm(null)}
                        disabled={updating}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={() => removeStudent(student._id)}
                        disabled={updating}
                    >
                        {updating ? 'Removing...' : 'Remove Student'}
                    </button>
                </div>
            </div>
        </div>
    );

    // Confirmation modal for removing teacher
    const RemoveTeacherConfirmModal = ({ teacher }) => (
        <div className="modal-overlay" onClick={() => setShowRemoveTeacherConfirm(null)}>
            <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Remove Teacher</h3>
                </div>
                <div className="modal-body">
                    <p>Are you sure you want to remove <strong>{teacher?.name || 'this teacher'}</strong> from this class?</p>
                    <p className="warning-text">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowRemoveTeacherConfirm(null)}
                        disabled={updating}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={() => removeTeacher(teacher._id)}
                        disabled={updating}
                    >
                        {updating ? 'Removing...' : 'Remove Teacher'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (!className) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Redirecting...</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading class details...</p>
            </div>
        );
    }

    if (error && !classes) {
        return (
            <div className="error-container">
                <div className="error-card">
                    <div className="error-icon">⚠️</div>
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/dashboard')}>
                        Back to Classes
                    </button>
                </div>
            </div>
        );
    }

    return (

        <Box sx={{ flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Navbar />
            <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
                <div className="class-home-container">
                    <div className="header-section">
                        <button className="btn btn-back" onClick={() => navigate('/admin/dashboard')}>
                            <span className="back-icon">←</span>
                            Back to Classes
                        </button>

                        <div className="class-header">
                            <h1 className="class-title">{className}</h1>
                            <div className="class-meta">
                                <span className="created-date">
                                    Created: {classes ? new Date(classes[0][0].createdAt).toLocaleDateString() : ''}
                                </span>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="search-section">
                            <div className="search-container">
                                <div className="search-input-wrapper">
                                    <span className="search-icon">🔍</span>
                                    <input
                                        type="text"
                                        className="search-input"
                                        placeholder="Search students, teachers, or subjects..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button className="clear-search-btn" onClick={clearSearch}>
                                            ×
                                        </button>
                                    )}
                                </div>

                                <select
                                    className="search-filter"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                >
                                    <option value="all">All</option>
                                    <option value="students">Students</option>
                                    <option value="teachers">Teachers</option>
                                    <option value="subjects">Subjects</option>
                                </select>
                            </div>

                            {searchQuery && (
                                <div className="search-results-info">
                                    <span className="results-count">
                                        {getSearchResultsCount()} result(s) found for "{searchQuery}"
                                    </span>
                                    <button className="clear-search-link" onClick={clearSearch}>
                                        Clear search
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            <span className="alert-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    {updating && (
                        <div className="alert alert-info">
                            <div className="updating-spinner"></div>
                            Updating class information...
                        </div>
                    )}

                    {classes && classes[0][0] ? (
                        <div className="content-grid">

                            {/* Enhanced Teacher Section */}
                            <div className={`card ${(searchFilter === 'all' || searchFilter === 'teachers') ? '' : 'hidden'}`}>
                                <div className="card-header">
                                    <div className="card-title-section">
                                        <h3 className="card-title">
                                            <span className="icon">👨‍🏫</span>
                                            Teachers ({searchQuery ? filteredTeachers.length : (classes[0][0].teachers?.length || 0)})
                                            {searchQuery && filteredTeachers.length > 0 && (
                                                <span className="search-match-badge">{filteredTeachers.length}</span>
                                            )}
                                        </h3>
                                        {!searchQuery && (
                                            <button
                                                className="btn btn-primary btn-add-teachers"
                                                onClick={() => setShowAddTeacherModal(true)}
                                                disabled={updating}
                                            >
                                                <span className="btn-icon">+</span>
                                                Add Teachers
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="card-content">
                                    {searchQuery ? (
                                        filteredTeachers.length > 0 ? (
                                            <div className="teachers-grid">
                                                {filteredTeachers.map(teacher => (
                                                    <div key={teacher._id} className="teacher-card search-highlight">
                                                        <div className="teacher-card-header">
                                                            <div className="user-avatar">
                                                                {teacher?.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div className="teacher-actions">
                                                                <button
                                                                    className="btn-icon-danger"
                                                                    onClick={() => setShowRemoveTeacherConfirm(teacher)}
                                                                    title="Remove teacher"
                                                                    disabled={updating}
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="teacher-card-body">
                                                            <h4 className="teacher-name">{teacher?.name || 'Unknown'}</h4>
                                                            <p className="teacher-email">{teacher?.email || 'No email'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-search-results">
                                                <p>No teachers match your search</p>
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            {classes[0][0].teachers && classes[0][0].teachers.length > 0 ? (
                                                <div className="teachers-grid">
                                                    {classes[0][0].teachers.map(teacher => (
                                                        <div key={teacher._id} className="teacher-card">
                                                            <div className="teacher-card-header">
                                                                <div className="user-avatar">
                                                                    {teacher?.name?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                                <div className="teacher-actions">
                                                                    <button
                                                                        className="btn-icon-danger"
                                                                        onClick={() => setShowRemoveTeacherConfirm(teacher)}
                                                                        title="Remove teacher"
                                                                        disabled={updating}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="teacher-card-body">
                                                                <h4 className="teacher-name">{teacher?.name || 'Unknown'}</h4>
                                                                <p className="teacher-email">{teacher?.email || 'No email'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-state">
                                                    <div className="empty-state-icon">👨‍🏫</div>
                                                    <h4>No teachers assigned</h4>
                                                    <p>Assign teachers to manage this class</p>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => setShowAddTeacherModal(true)}
                                                        disabled={updating}
                                                    >
                                                        Add Teachers
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Enhanced Students Section */}
                            <div className={`card students-card ${(searchFilter === 'all' || searchFilter === 'students') ? '' : 'hidden'}`}>
                                <div className="card-header">
                                    <div className="card-title-section">
                                        <h3 className="card-title">
                                            <span className="icon">👥</span>
                                            Students ({searchQuery ? filteredStudents.length : classes[0][0].students?.length || 0})
                                            {searchQuery && filteredStudents.length > 0 && (
                                                <span className="search-match-badge">{filteredStudents.length}</span>
                                            )}
                                        </h3>
                                        {!searchQuery && (
                                            <button
                                                className="btn btn-primary btn-add-students"
                                                onClick={() => setShowAddStudentModal(true)}
                                                disabled={updating}
                                            >
                                                <span className="btn-icon">+</span>
                                                Add Students
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="card-content">
                                    {searchQuery ? (
                                        filteredStudents.length > 0 ? (
                                            <div className="students-grid">
                                                {filteredStudents.map(student => (
                                                    <div key={student._id} className="student-card search-highlight">
                                                        <div className="student-card-header">
                                                            <div className="user-avatar">
                                                                {student?.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div className="student-actions">
                                                                <button
                                                                    className="btn-icon-danger"
                                                                    onClick={() => setShowRemoveConfirm(student)}
                                                                    title="Remove student"
                                                                    disabled={updating}
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="student-card-body">
                                                            <h4 className="student-name">{student?.name || 'Unknown'}</h4>
                                                            <p className="student-email">{student?.email || 'No email'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-search-results">
                                                <p>No students match your search</p>
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            {classes[0][0].students && classes[0][0].students.length > 0 ? (
                                                <div className="students-grid">
                                                    {classes[0][0].students.map(student => (
                                                        <div key={student._id} className="student-card">
                                                            <div className="student-card-header">
                                                                <div className="user-avatar">
                                                                    {student?.name?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                                <div className="student-actions">
                                                                    <button
                                                                        className="btn-icon-danger"
                                                                        onClick={() => setShowRemoveConfirm(student)}
                                                                        title="Remove student"
                                                                        disabled={updating}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="student-card-body">
                                                                <h4 className="student-name">{student?.name || 'Unknown'}</h4>
                                                                <p className="student-email">{student?.email || 'No email'}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-state">
                                                    <div className="empty-state-icon">👥</div>
                                                    <h4>No students enrolled</h4>
                                                    <p>Start by adding students to this class</p>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => setShowAddStudentModal(true)}
                                                        disabled={updating}
                                                    >
                                                        Add Students
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Enhanced Subjects Section */}
                            <div className={`card subjects-card ${(searchFilter === 'all' || searchFilter === 'subjects') ? '' : 'hidden'}`}>
                                <div className="card-header">
                                    <h3 className="card-title">
                                        <span className="icon">📚</span>
                                        Subjects ({searchQuery ? filteredSubjects.length : (classes[0][0].subjects?.length || 0)})
                                        {searchQuery && filteredSubjects.length > 0 && (
                                            <span className="search-match-badge">{filteredSubjects.length}</span>
                                        )}
                                    </h3>
                                </div>
                                <div className="card-content">
                                    {searchQuery ? (
                                        filteredSubjects.length > 0 ? (
                                            <div className="subjects-list">
                                                {filteredSubjects.map((subject, index) => (
                                                    <div key={`${subject}-${index}`} className="subject-tag search-highlight">
                                                        <span className="subject-name">{subject}</span>
                                                        <button
                                                            className="remove-btn"
                                                            onClick={() => removeSubject(subject)}
                                                            title={`Remove ${subject}`}
                                                            disabled={updating}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="no-search-results">
                                                <p>No subjects match your search</p>
                                            </div>
                                        )
                                    ) : (
                                        <>
                                            {classes[0][0].subjects && classes[0][0].subjects.length > 0 ? (
                                                <div className="subjects-list">
                                                    {classes[0][0].subjects.map((subject, index) => (
                                                        <div key={`${subject}-${index}`} className="subject-tag">
                                                            <span className="subject-name">{subject}</span>
                                                            <button
                                                                className="remove-btn"
                                                                onClick={() => removeSubject(subject)}
                                                                title={`Remove ${subject}`}
                                                                disabled={updating}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="empty-state">
                                                    <div className="empty-state-icon">📚</div>
                                                    <h4>No subjects added</h4>
                                                    <p>Add subjects to organize your class curriculum</p>
                                                </div>
                                            )}

                                            <div className="add-section">
                                                <div className="add-subject-form">
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={newSubject}
                                                        onChange={(e) => setNewSubject(e.target.value)}
                                                        placeholder="Enter subject name"
                                                        disabled={updating}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addSubject();
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={addSubject}
                                                        disabled={!newSubject.trim() || updating}
                                                    >
                                                        {updating ? 'Adding...' : 'Add Subject'}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state-container">
                            <div className="empty-state">
                                <h3>No class found</h3>
                                <p>The requested class could not be found.</p>
                            </div>
                        </div>
                    )}

                    {/* Modals */}
                    {showAddTeacherModal && <AddTeacherModal />}
                    {showAddStudentModal && <AddStudentModal />}
                    {showRemoveConfirm && <RemoveConfirmModal student={showRemoveConfirm} />}
                    {showRemoveTeacherConfirm && <RemoveTeacherConfirmModal teacher={showRemoveTeacherConfirm} />}
                </div>
            </Container>
        </Box>
    );
}

export default Classhome;
