import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { setLoading } from '../../../redux/slices/authSlice';
import './Create-Class.css';
import Navbar from '../../common/Navbar';
import { Box } from '@mui/material';

function CreateClass() {
    const [className, setClassName] = useState('');
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedTeachers, setSelectedTeachers] = useState([]);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [subjectInput, setSubjectInput] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { token } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                dispatch(setLoading(true));
                const res = await axios.get('http://localhost:5000/api/admin/get-users', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const allUsers = res.data;
                setStudents(allUsers.data.filter((u) => u.role === 'student'));
                setTeachers(allUsers.data.filter((u) => u.role === 'teacher'));
            } catch (err) {
                console.error("Error fetching users:", err);
                setError('Error fetching users. Please try again later.');
            } finally {
                dispatch(setLoading(false));
            }
        };
        fetchUsers();
    }, [token, dispatch]);

    const handleAddSubject = () => {
        if (subjectInput.trim() !== '' && !subjects.includes(subjectInput.trim())) {
            setSubjects([...subjects, subjectInput.trim()]);
            setSubjectInput('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleAddSubject();
        }
    };

    const removeSubject = (subject) => {
        setSubjects(subjects.filter(s => s !== subject));
    };

    const addStudent = (id) => {
        const student = students.find((s) => s._id === id);
        if (student && !selectedStudents.some(s => s._id === student._id)) {
            setSelectedStudents([...selectedStudents, student]);
        }
    };

    const removeStudent = (id) => {
        setSelectedStudents(selectedStudents.filter((s) => s._id !== id));
    };

    const handleTeacherSelect = (id) => {
        const teacher = teachers.find(t => t._id === id);
        if (teacher && !selectedTeachers.some(t => t._id === id)) {
            setSelectedTeachers([...selectedTeachers, teacher]);
        }
    };

    const removeTeacher = (id) => {
        setSelectedTeachers(selectedTeachers.filter(t => t._id !== id));
    };

    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        console.log('=== FRONTEND SUBMIT START ===');
        console.log('Class name:', className);
        console.log('Selected students:', selectedStudents);
        console.log('Selected teachers:', selectedTeachers);
        console.log('Subjects:', subjects);

        if (!className || !className.trim()) {
            setError('Class name is required.');
            return;
        }

        const payload = {
            className: className.trim(),
            studentIds: selectedStudents.map(s => s._id),
            teacherIds: selectedTeachers.map(t => t._id),
            subjects: subjects.filter(s => s && s.trim()), // Filter out empty subjects
        };

        console.log('Sending payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await axios.post('http://localhost:5000/api/admin/create-class', payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Success response:', response.data);
            setSuccess('Class created successfully!');

            // Reset form
            setClassName('');
            setSelectedStudents([]);
            setSelectedTeachers([]);
            setSubjects([]);

        } catch (err) {
            console.error('❌ Error creating class:', err);
            console.error('Error response status:', err.response?.status);
            console.error('Error response data:', err.response?.data);
            console.error('Error config:', err.config);

            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.status === 500) {
                setError('Server error occurred. Please check the server logs for details.');
            } else if (err.response?.status === 401) {
                setError('Unauthorized. Please log in again.');
            } else if (err.response?.status === 403) {
                setError('Access denied. Admin privileges required.');
            } else if (err.code === 'NETWORK_ERROR') {
                setError('Network error. Please check if the server is running.');
            } else {
                setError('Failed to create class. Please try again.');
            }
        }
    };


    // Filter students based on search - includes both selected and unselected
    const getFilteredStudents = () => {
        const searchTerm = studentSearch.toLowerCase();
        const filteredSelected = selectedStudents.filter(s =>
            s.name.toLowerCase().includes(searchTerm)
        );
        const filteredUnselected = students.filter(s =>
            s.name.toLowerCase().includes(searchTerm) &&
            !selectedStudents.some(sel => sel._id === s._id)
        );
        return { filteredSelected, filteredUnselected };
    };

    // Filter teachers based on search - includes both selected and unselected
    const getFilteredTeachers = () => {
        const searchTerm = teacherSearch.toLowerCase();
        const filteredSelected = selectedTeachers.filter(t =>
            t.name.toLowerCase().includes(searchTerm)
        );
        const filteredUnselected = teachers.filter(t =>
            t.name.toLowerCase().includes(searchTerm) &&
            !selectedTeachers.some(sel => sel._id === t._id)
        );
        return { filteredSelected, filteredUnselected };
    };

    const { filteredSelected: filteredSelectedStudents, filteredUnselected: filteredUnselectedStudents } = getFilteredStudents();
    const { filteredSelected: filteredSelectedTeachers, filteredUnselected: filteredUnselectedTeachers } = getFilteredTeachers();

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Navbar />
            <div className="class-form-container">
                <h2>Create New Class</h2>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="form-group">
                    <label>Class Name *</label>
                    <input
                        type="text"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="Enter class name"
                    />
                </div>

                <div className="form-group">
                    <label>Subjects</label>
                    <div className="subject-section">
                        <div className="subject-input-container">
                            <div className="section-header">
                                <label>Add Subject</label>
                            </div>
                            <div className="subject-input-group">
                                <input
                                    type="text"
                                    value={subjectInput}
                                    onChange={(e) => setSubjectInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter subject name"
                                />
                                <button onClick={handleAddSubject}>Add Subject</button>
                            </div>
                        </div>
                        <div className="subject-display-container">
                            <div className="section-header">
                                <label>Added Subjects ({subjects.length})</label>
                            </div>
                            <div className="subject-list-box">
                                {subjects.length > 0 ? (
                                    <div className="subject-list">
                                        {subjects.map((subject) => (
                                            <div key={subject} className="subject-item">
                                                <span>{subject}</span>
                                                <button onClick={() => removeSubject(subject)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        No subjects added yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>Students</label>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔍 Search students..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                    />
                    <div className="dual-list-users">
                        <div>
                            <div className="section-header">
                                <label>Selected Students ({selectedStudents.length})</label>
                            </div>
                            <div className="list-box">
                                {filteredSelectedStudents.length > 0 ? (
                                    filteredSelectedStudents.map((s) => (
                                        <div key={s._id} onClick={() => removeStudent(s._id)} className="list-item selected">
                                            {s.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        {studentSearch ? 'No matching selected students' : 'No students selected'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="section-header">
                                <label>Available Students ({students.length - selectedStudents.length})</label>
                            </div>
                            <div className="list-box">
                                {filteredUnselectedStudents.length > 0 ? (
                                    filteredUnselectedStudents.map((s) => (
                                        <div key={s._id} onClick={() => addStudent(s._id)} className="list-item">
                                            {s.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        {studentSearch ? 'No matching available students' : 'No available students'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>Teachers</label>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔍 Search teachers..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                    />
                    <div className="dual-list-users">
                        <div>
                            <div className="section-header">
                                <label>Selected Teachers ({selectedTeachers.length})</label>
                            </div>
                            <div className="list-box">
                                {filteredSelectedTeachers.length > 0 ? (
                                    filteredSelectedTeachers.map((t) => (
                                        <div key={t._id} className="list-item selected" onClick={() => removeTeacher(t._id)}>
                                            {t.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        {teacherSearch ? 'No matching selected teachers' : 'No teachers selected'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="section-header">
                                <label>Available Teachers ({teachers.length - selectedTeachers.length})</label>
                            </div>
                            <div className="list-box">
                                {filteredUnselectedTeachers.length > 0 ? (
                                    filteredUnselectedTeachers.map((t) => (
                                        <div
                                            key={t._id}
                                            onClick={() => handleTeacherSelect(t._id)}
                                            className="list-item"
                                        >
                                            {t.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        {teacherSearch ? 'No matching available teachers' : 'No available teachers'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <button className="submit-btn" onClick={handleSubmit}>
                    Create Class
                </button>
            </div>
        </Box>
    );
}

export default CreateClass;
