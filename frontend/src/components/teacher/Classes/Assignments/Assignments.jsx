import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import Navbar from '../../../common/Navbar';
import './Assignments.css';

function Assignments() {
    const [assignments,
        setAssignments] = useState([]);
    const [filteredAssignments,
        setFilteredAssignments] = useState([]);
    const [showCreateForm,
        setShowCreateForm] = useState(false);
    const [editingAssignment,
        setEditingAssignment] = useState(null);
    const [selectedAssignment,
        setSelectedAssignment] = useState(null);
    const [submissions,
        setSubmissions] = useState([]);
    const [loading,
        setLoading] = useState(false);

    const [message,
        setMessage] = useState({
            type: '', text: ''
        });
    const [classInfo,
        setClassInfo] = useState(null);

    // Search and filter states
    const [searchTerm,
        setSearchTerm] = useState('');
    const [filterStatus,
        setFilterStatus] = useState([]);
    const [filterPriority,
        setFilterPriority] = useState([]);

    // Dropdown visibility states
    const [showStatusDropdown,
        setShowStatusDropdown] = useState(false);
    const [showPriorityDropdown,
        setShowPriorityDropdown] = useState(false);

    // Refs for dropdown management
    const statusDropdownRef = useRef(null);
    const priorityDropdownRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();

    // Get data passed from Class-home
    const className = location.state?.className;
    const passedClassData = location.state?.classData;
    const passedClassId = location.state?.classId;

    // Use the correct class ID
    const classId = passedClassId || (passedClassData && passedClassData[0]?._id);

    const [formData,
        setFormData] = useState({
            title: '',
            description: '',
            dueDate: '',
            totalMarks: 100,
            instructions: '',
            attachments: []
        });

    // Status and Priority options
    const statusOptions = [{
        value: 'active', label: 'Active'
    }

        ,
    {
        value: 'due-soon', label: 'Due Soon'
    }

        ,
    {
        value: 'overdue', label: 'Overdue'
    }

    ];

    const priorityOptions = [{
        value: 'high', label: 'High'
    }

        ,
    {
        value: 'medium', label: 'Medium'
    }

        ,
    {
        value: 'normal', label: 'Normal'
    }

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
        }

            ;

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        }

            ;
    }

        , []);

    // Filter and search assignments
    useEffect(() => {
        let filtered = [...assignments];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(assignment => assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) || assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) || (assignment.instructions && assignment.instructions.toLowerCase().includes(searchTerm.toLowerCase())));
        }

        // Status filter
        if (filterStatus.length > 0) {
            filtered = filtered.filter(assignment => {
                const status = getStatusColor(assignment.dueDate);
                return filterStatus.includes(status);
            });
        }

        // Priority filter (if you add priority to assignments in the future)
        if (filterPriority.length > 0) {
            filtered = filtered.filter(assignment => filterPriority.includes(assignment.priority || 'normal'));
        }

        setFilteredAssignments(filtered);
    }

        , [assignments, searchTerm, filterStatus, filterPriority]);

    useEffect(() => {
        if (classId) {
            fetchClassInfo();
            fetchAssignments();
        }

        else {
            setMessage({
                type: 'error', text: 'Class ID not found. Please go back and select a class.'
            });
        }
    }

        , [classId]);

    const fetchClassInfo = async () => {

        setClassInfo(passedClassData[0]);

    }

        ;

    const fetchAssignments = async () => {
        try {
            setLoading(true);

            setMessage({
                type: '', text: ''
            });

            const response = await fetch(`http://localhost:5000/api/teacher/classes/${classId}/assignments`, {

                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')} `
                    ,
                    'Content-Type': 'application/json'
                }
            });

            const contentType = response.headers.get('content-type');

            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Server returned non-JSON response. Status: $ {
            response.status
        }

        `);
            }

            if (!response.ok) {
                const errorData = await response.json();

                throw new Error(errorData.message || `HTTP error ! status: $ {
            response.status
        }

        `);
            }

            const data = await response.json();
            setAssignments(data);
        }

        catch (error) {
            console.error('Error fetching assignments:', error);

            setMessage({
                type: 'error', text: `Failed to fetch assignments: $ {
            error.message
        }

        `
            });
        }

        finally {
            setLoading(false);
        }
    }

        ;

    const fetchSubmissions = async (assignmentId) => {
        try {
            setMessage({
                type: '', text: ''
            });
            const response = await fetch(`http://localhost:5000/api/teacher/assignments/${assignmentId}/submissions`, {

                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')} `
                }

            });

            if (!response.ok) {
                throw new Error(`HTTP error ! status: $ {
            response.status
        }

        `);
            }

            const data = await response.json();
            setSubmissions(data);
        }

        catch (error) {
            console.error('Error fetching submissions:', error);

            setMessage({
                type: 'error', text: 'Failed to fetch submissions. Please try again.'
            });
        }
    }

        ;

    const showMessage = (type, text) => {
        setMessage({
            type, text
        });

        setTimeout(() => setMessage({
            type: '', text: ''
        }), 5000);
    }

        ;

    const handleInputChange = (e) => {
        const {
            name,
            value
        }

            = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }

        ;

    const handleFileChange = (e) => {
        setFormData(prev => ({
            ...prev,
            attachments: Array.from(e.target.files)
        }));
    }

        ;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!classId) {
            setMessage({
                type: 'error', text: 'Class ID is required'
            });
            return;
        }

        try {
            setMessage({
                type: '', text: ''
            });
            const formDataToSend = new FormData();

            formDataToSend.append('title', formData.title);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('dueDate', formData.dueDate);
            formDataToSend.append('totalMarks', formData.totalMarks);
            formDataToSend.append('instructions', formData.instructions);

            formData.attachments.forEach(file => {
                formDataToSend.append('attachments', file);
            });

            const url = editingAssignment ? `http://localhost:5000/api/teacher/assignments/${editingAssignment._id}`
                : `http://localhost:5000/api/teacher/classes/${classId}/assignments`;

            const method = editingAssignment ? 'PUT' : 'POST';

            const response = await fetch(url, {

                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')
                        }

        `
                }

                ,
                body: formDataToSend
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save assignment');
            }

            await fetchAssignments();
            resetForm();
            setShowCreateForm(false);
            setEditingAssignment(null);
            showMessage('success', editingAssignment ? 'Assignment updated successfully' : 'Assignment created successfully');
        }

        catch (error) {
            console.error('Error saving assignment:', error);

            setMessage({
                type: 'error', text: error.message || 'Failed to save assignment. Please try again.'
            });
        }
    }

        ;

    const handleEdit = (assignment) => {
        setEditingAssignment(assignment);

        setFormData({
            title: assignment.title,
            description: assignment.description,
            dueDate: new Date(assignment.dueDate).toISOString().split('T')[0],
            totalMarks: assignment.totalMarks,
            instructions: assignment.instructions || '',
            attachments: []
        });
        setShowCreateForm(true);
    }

        ;

    const handleDelete = async (assignmentId) => {
        if (window.confirm('Are you sure you want to delete this assignment? This will also delete all submissions.')) {
            try {
                setMessage({
                    type: '', text: ''
                });
                const response = await fetch(`http://localhost:5000/api/teacher/assignments/${assignmentId}`, {

                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')
                            }

                `
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete assignment');
                }

                await fetchAssignments();
                showMessage('success', 'Assignment deleted successfully');
            }

            catch (error) {
                console.error('Error deleting assignment:', error);

                setMessage({
                    type: 'error', text: error.message || 'Failed to delete assignment. Please try again.'
                });
            }
        }
    }

        ;

    const handleGradeSubmission = async (submissionId, marks, feedback) => {
        try {
            setMessage({
                type: '', text: ''
            });
            const response = await fetch(`http://localhost:5000/api/teacher/submissions/${submissionId}/grade`, {

                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')} `
                },
                body: JSON.stringify({
                    marks, feedback
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to grade submission');
            }

            await fetchSubmissions(selectedAssignment._id);
            showMessage('success', 'Submission graded successfully');
        }

        catch (error) {
            console.error('Error grading submission:', error);

            setMessage({
                type: 'error', text: error.message || 'Failed to grade submission. Please try again.'
            });
        }
    }

        ;

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            dueDate: '',
            totalMarks: 100,
            instructions: '',
            attachments: []
        });
    }

        ;

    const getStatusColor = (dueDate) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays <= 3) return 'due-soon';
        return 'active';
    }

        ;

    // Handle back to class home
    const handleBackToClass = () => {
        const classData = classInfo || passedClassData?.[0] || passedClassData;

        if (classData) {
            const cname = classData.name;
            const classroutename = cname.replace(/\s+/g, '-').toLowerCase();

            navigate(`/teacher/class/$ {
                classroutename
            }

            `, {
                state: {
                    className: classData.name
                }
            });
        }

        else {
            navigate(-1);
        }
    }

        ;

    // Handle status filter changes
    const handleStatusFilterChange = (status) => {
        setFilterStatus(prev => {
            if (prev.includes(status)) {
                return prev.filter(s => s !== status);
            }

            else {
                return [...prev, status];
            }
        });
    }

        ;

    // Handle priority filter changes
    const handlePriorityFilterChange = (priority) => {
        setFilterPriority(prev => {
            if (prev.includes(priority)) {
                return prev.filter(p => p !== priority);
            }

            else {
                return [...prev, priority];
            }
        });
    }

        ;

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setFilterStatus([]);
        setFilterPriority([]);
    }

        ;

    // Get display text for dropdown
    const getStatusDisplayText = () => {
        if (filterStatus.length === 0) return 'Select Status';
        if (filterStatus.length === 1) return statusOptions.find(opt => opt.value === filterStatus[0])?.label;

        return `$ {
        filterStatus.length
    }

    selected`;
    }

        ;

    const getPriorityDisplayText = () => {
        if (filterPriority.length === 0) return 'Select Priority';
        if (filterPriority.length === 1) return priorityOptions.find(opt => opt.value === filterPriority[0])?.label;

        return `$ {
        filterPriority.length
    }

    selected`;
    }

        ;

    // Calculate statistics
    const totalAssignments = assignments.length;
    const activeAssignments = assignments.filter(a => getStatusColor(a.dueDate) === 'active').length;
    const dueSoonAssignments = assignments.filter(a => getStatusColor(a.dueDate) === 'due-soon').length;

    if (!classId) {
        return (<Box sx={
            {
                flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh'
            }
        }

        > <Navbar /> <Container maxWidth="lg" sx={
            {
                pt: 4, pb: 4
            }
        }

        > <div className="assignments-error-container" > <h2>Error</h2> <p>Class information not found. Please go back and select a class.</p> <button onClick={
            () => navigate(-1)
        }

            className="btn btn-primary" > Go Back </button> </div> </Container> </Box>);
    }

    if (loading) {
        return (<Box sx={
            {
                flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh'
            }
        }

        > <Navbar /> <Container maxWidth="lg" sx={
            {
                pt: 4, pb: 4
            }
        }

        > <div className="assignments-loading" >Loading assignments...</div> </Container> </Box>);
    }

    return (<Box sx={
        {
            flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh'
        }
    }

    > <Navbar /> <Container maxWidth="lg" sx={
        {
            pt: 4, pb: 4
        }
    }

    > <div className="assignments-container" > {
        message.text && (<div className={
            `assignments-message $ {
                    message.type
                }

                `
        }

        > <p> {
            message.text
        }

            </p> <button onClick={
                () => setMessage({
                    type: '', text: ''
                })
            }

                className="assignments-message-close"
            > × </button> </div>)
    }

                <div className="assignments-top-bar" > <button className="assignments-back-btn"

                    onClick={
                        handleBackToClass
                    }

                    title="Back to Class Home"

                > ← Back to Class </button> </div> <div className="assignments-header" > <div className="assignments-class-context" > <h2>Class Assignments</h2> {
                    (classInfo || passedClassData) && (<div className="assignments-class-info" > <span className="assignments-class-name" > {
                        classInfo?.name || passedClassData?.[0]?.name || passedClassData?.name || className
                    }

                    </span> <span className="assignments-class-details" > {
                        (classInfo?.subject || passedClassData?.[0]?.subject || passedClassData?.subject)
                    }

                            • {
                                ' '
                            }

                            {
                                (classInfo?.students?.length || passedClassData?.[0]?.students?.length || passedClassData?.students?.length || 0)
                            }

                            students </span> </div>)
                }

                </div> </div> {
                    /* Search and Filter Section */
                }

                <div className="assignments-search-filter-section" > <div className="assignments-search-and-create" > <div className="assignments-search-bar" > <input type="text"
                    placeholder="Search assignments by title, description, or instructions..."

                    value={
                        searchTerm
                    }

                    onChange={
                        (e) => setSearchTerm(e.target.value)
                    }

                    className="assignments-search-input"

                /> <span className="assignments-search-icon" >🔍</span> </div> <button className="assignments-create-btn"
                    onClick={
                        () => setShowCreateForm(true)
                    }

                > + New Assignment </button> </div> <div className="assignments-filter-controls" > {
                    /* Status Filter */
                }

                        <div className="assignments-filter-group" ref={
                            statusDropdownRef
                        }

                        > <label>Status:</label> <div className="assignments-custom-dropdown" > <button type="button"
                            className="assignments-dropdown-toggle"

                            onClick={
                                () => setShowStatusDropdown(!showStatusDropdown)
                            }

                        > {
                                getStatusDisplayText()
                            }

                            <span className={
                                `assignments-dropdown-arrow $ {
        showStatusDropdown ? 'open' : ''
    }

    `
                            }

                            >▼</span> </button> {
                                    showStatusDropdown && (<div className="assignments-dropdown-menu" > {
                                        statusOptions.map(option => (<label key={
                                            option.value
                                        }

                                            className="assignments-dropdown-item" > <input type="checkbox"

                                                checked={
                                                    filterStatus.includes(option.value)
                                                }

                                                onChange={
                                                    () => handleStatusFilterChange(option.value)
                                                }

                                            /> <span className="assignments-checkbox-label" > {
                                                option.label
                                            }

                                            </span> </label>))
                                    }

                                    </div>)
                                }

                            </div> </div> {
                            /* Priority Filter */
                        }

                        <div className="assignments-filter-group" ref={
                            priorityDropdownRef
                        }

                        > <label>Priority:</label> <div className="assignments-custom-dropdown" > <button type="button"
                            className="assignments-dropdown-toggle"

                            onClick={
                                () => setShowPriorityDropdown(!showPriorityDropdown)
                            }

                        > {
                                getPriorityDisplayText()
                            }

                            <span className={
                                `assignments-dropdown-arrow $ {
        showPriorityDropdown ? 'open' : ''
    }

    `
                            }

                            >▼</span> </button> {
                                    showPriorityDropdown && (<div className="assignments-dropdown-menu" > {
                                        priorityOptions.map(option => (<label key={
                                            option.value
                                        }

                                            className="assignments-dropdown-item" > <input type="checkbox"

                                                checked={
                                                    filterPriority.includes(option.value)
                                                }

                                                onChange={
                                                    () => handlePriorityFilterChange(option.value)
                                                }

                                            /> <span className="assignments-checkbox-label" > {
                                                option.label
                                            }

                                            </span> </label>))
                                    }

                                    </div>)
                                }

                            </div> </div> <button className="assignments-clear-filters-btn"

                                onClick={
                                    clearFilters
                                }

                                title="Clear all filters"

                            > Clear Filters </button> </div> <div className="assignments-results-info" > Showing {
                                filteredAssignments.length
                            }

                        of {
                            assignments.length
                        }

                        assignments {
                            filterStatus.length > 0 && (<span className="assignments-active-filters" > • Status: {
                                filterStatus.map(s => statusOptions.find(opt => opt.value === s)?.label).join(', ')
                            }

                            </span>)
                        }

                        {
                            filterPriority.length > 0 && (<span className="assignments-active-filters" > • Priority: {
                                filterPriority.map(p => priorityOptions.find(opt => opt.value === p)?.label).join(', ')
                            }

                            </span>)
                        }

                    </div> </div> {
                    showCreateForm && (<div className="assignment-form-overlay" > <div className="assignment-form" > <h3> {
                        editingAssignment ? 'Edit Assignment' : 'Create New Assignment'
                    }

                        {
                            (classInfo || passedClassData) && (<span className="assignments-form-class-context" > {
                                ' '
                            }

                                for {
                                    classInfo?.name || passedClassData?.[0]?.name || passedClassData?.name || className
                                }

                            </span>)
                        }

                    </h3> <form onSubmit={
                        handleSubmit
                    }

                    > <div className="form-group" > <label>Title *</label> <input type="text"
                        name="title"

                        value={
                            formData.title
                        }

                        onChange={
                            handleInputChange
                        }

                        required /> </div> <div className="form-group" > <label>Description *</label> <textarea name="description"

                            value={
                                formData.description
                            }

                            onChange={
                                handleInputChange
                            }

                            rows="4"
                            required /> </div> <div className="form-row" > <div className="form-group" > <label>Due Date *</label> <input type="date"
                                name="dueDate"

                                value={
                                    formData.dueDate
                                }

                                onChange={
                                    handleInputChange
                                }

                                min={
                                    new Date().toISOString().split('T')[0]
                                }

                                required /> </div> <div className="form-group" > <label>Total Marks</label> <input type="number"
                                    name="totalMarks"

                                    value={
                                        formData.totalMarks
                                    }

                                    onChange={
                                        handleInputChange
                                    }

                                    min="1"
                                    max="1000"

                                /> </div> </div> <div className="form-group" > <label>Instructions</label> <textarea name="instructions"
                                    value={
                                        formData.instructions
                                    }

                                    onChange={
                                        handleInputChange
                                    }

                                    rows="3"
                                    placeholder="Additional instructions for students..."

                                /> </div> <div className="form-group" > <label>Attachments (Max 5 files, 10MB each)</label> <input type="file"
                                    onChange={
                                        handleFileChange
                                    }

                                    multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.ppt,.pptx"

                                /> <small className="file-help" > Supported formats: PDF, Word, Text, Images, PowerPoint </small> </div> <div className="form-actions" > <button type="submit" className="btn btn-primary" > {
                                    editingAssignment ? 'Update Assignment' : 'Create Assignment'
                                }

                                </button> <button type="button"
                                    className="btn btn-secondary"

                                    onClick={
                                        () => {
                                            setShowCreateForm(false);
                                            setEditingAssignment(null);
                                            resetForm();

                                            setMessage({
                                                type: '', text: ''
                                            });
                                        }
                                    }

                                > Cancel </button> </div> </form> </div> </div>)
                }

                <div className="assignments-list" > {
                    filteredAssignments.length === 0 ? (<div className="assignments-no-assignments" > {
                        assignments.length === 0 ? (<> <div className="assignments-no-assignments-icon" >📝</div> <h3>No assignments created yet</h3> <p>Click "New Assignment" to get started with your first assignment.</p> <button className="btn btn-primary"

                            onClick={
                                () => setShowCreateForm(true)
                            }

                        > Create Your First Assignment </button> </>) : (<> <div className="assignments-no-assignments-icon" >🔍</div> <h3>No assignments match your search criteria</h3> <p>Try adjusting your search terms or filters.</p> <button className="btn btn-secondary"

                            onClick={
                                clearFilters
                            }

                        > Clear Filters </button> </>)
                    }

                    </div>) : (filteredAssignments.map(assignment => (<div key={
                        assignment._id
                    }

                        className={
                            `assignment-card $ {
                        getStatusColor(assignment.dueDate)
                    }

                    `
                        }

                    > <div className="assignment-header" > <div className="assignment-title-section" > <h3> {
                        assignment.title
                    }

                    </h3> <div className="status-badge" > {
                        getStatusColor(assignment.dueDate) === 'overdue' && '🔴 Overdue'
                    }

                            {
                                getStatusColor(assignment.dueDate) === 'due-soon' && '🟡 Due Soon'
                            }

                            {
                                getStatusColor(assignment.dueDate) === 'active' && '🟢 Active'
                            }

                        </div> </div> <div className="assignment-actions" > <button className="btn btn-sm btn-outline"

                            onClick={
                                () => {
                                    setSelectedAssignment(assignment);
                                    fetchSubmissions(assignment._id);
                                }
                            }

                        > 📋 View Submissions ({
                                assignment.submissionCount || 0
                            }) </button> <button className="btn btn-sm btn-outline"

                                onClick={
                                    () => handleEdit(assignment)
                                }

                            > ✏️ Edit </button> <button className="btn btn-sm btn-danger"

                                onClick={
                                    () => handleDelete(assignment._id)
                                }

                            > 🗑️ Delete </button> </div> </div> <p className="assignment-description" > {
                                assignment.description
                            }

                        </p> <div className="assignment-details" > <div className="detail-item" > <span className="detail-label" >📅 Due Date:</span> <span className="detail-value" > {
                            new Date(assignment.dueDate).toLocaleDateString()
                        }

                        </span> </div> <div className="detail-item" > <span className="detail-label" >📊 Total Marks:</span> <span className="detail-value" > {
                            assignment.totalMarks
                        }

                        </span> </div> <div className="detail-item" > <span className="detail-label" >📝 Created:</span> <span className="detail-value" > {
                            new Date(assignment.createdAt).toLocaleDateString()
                        }

                        </span> </div> </div> {
                            assignment.instructions && (<div className="assignment-instructions" > <strong>📋 Instructions:</strong> <p> {
                                assignment.instructions
                            }

                            </p> </div>)
                        }

                        {
                            assignment.attachments && assignment.attachments.length > 0 && (<div className="assignment-attachments" > <strong>📎 Attachments:</strong> <div className="attachments-list" > {
                                assignment.attachments.map((attachment, index) => (<a key={
                                    index
                                }

                                    href={
                                        attachment.url
                                    }

                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="attachment-link"

                                > 📄 {
                                        attachment.name
                                    }

                                </a>))
                            }

                            </div> </div>)
                        }

                    </div>)))
                }

                </div> {
                    selectedAssignment && (<SubmissionsModal assignment={
                        selectedAssignment
                    }

                        submissions={
                            submissions
                        }

                        onClose={
                            () => {
                                setSelectedAssignment(null);
                                setSubmissions([]);

                                setMessage({
                                    type: '', text: ''
                                });
                            }
                        }

                        onGrade={
                            handleGradeSubmission
                        }

                        error={
                            message.type === 'error' ? message.text : ''
                        }

                    />)
                }

            </div> </Container> </Box>);
}

// Submissions Modal Component
function SubmissionsModal({
    assignment, submissions, onClose, onGrade, error

}) {
    const [gradingSubmission,
        setGradingSubmission] = useState(null);
    const [marks,
        setMarks] = useState('');
    const [feedback,
        setFeedback] = useState('');
    const [gradingError,
        setGradingError] = useState('');

    const handleGradeSubmit = async (submissionId) => {
        const marksNum = parseInt(marks);

        if (isNaN(marksNum) || marksNum < 0 || marksNum > assignment.totalMarks) {
            setGradingError(`Marks must be between 0 and $ {
                    assignment.totalMarks
                }

                `);
            return;
        }

        try {
            setGradingError('');
            await onGrade(submissionId, marksNum, feedback);
            setGradingSubmission(null);
            setMarks('');
            setFeedback('');
        }

        catch (error) {
            setGradingError('Failed to save grade. Please try again.');
        }
    }

        ;

    const startGrading = (submission) => {
        setGradingSubmission(submission._id);
        setMarks(submission.marks?.toString() || '');
        setFeedback(submission.feedback || '');
        setGradingError('');
    }

        ;

    const cancelGrading = () => {
        setGradingSubmission(null);
        setMarks('');
        setFeedback('');
        setGradingError('');
    }

        ;

    return (<div className="modal-overlay" > <div className="submissions-modal" > <div className="modal-header" > <h3>📋 Submissions for: {
        assignment.title
    }

    </h3> <button className="close-btn" onClick={
        onClose
    }

    >×</button> </div> {
            (error || gradingError) && (<div className="assignments-message error" > <p> {
                error || gradingError
            }

            </p> <button onClick={
                () => setGradingError('')
            }

                className="assignments-message-close" >×</button> </div>)
        }

        <div className="submissions-list" > {
            submissions.length === 0 ? (<div className="no-submissions" > <div className="no-submissions-icon" >📭</div> <h3>No submissions yet</h3> <p>Students haven't submitted their assignments yet.</p>
            </div>) : (submissions.map(submission => (<div key={
                submission._id
            }

                className="submission-card" > <div className="submission-header" > <div className="student-info" > <h4>👤 {
                    submission.student.name
                }

                </h4> <span className="student-email" >📧 {
                    submission.student.email
                }

                    </span> </div> <div className="submission-meta" > <span className="submission-date" > 🕒 Submitted: {
                        new Date(submission.submittedAt).toLocaleString()
                    }

                    </span> {
                            submission.isGraded && (<span className="graded-badge" >✅ Graded</span>)
                        }

                    </div> </div> {
                    submission.files && submission.files.length > 0 && (<div className="submission-files" > <strong>📁 Submitted Files:</strong> <div className="files-list" > {
                        submission.files.map((file, index) => (<a key={
                            index
                        }

                            href={
                                `http://localhost:5000${file.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-link"

                        > 📄 {
                                file.name
                            }

                        </a>))
                    }

                    </div> </div>)
                }

                {
                    submission.comments && (<div className="submission-comments" > <strong>💬 Student Comments:</strong> <p> {
                        submission.comments
                    }

                    </p> </div>)
                }

                <div className="grading-section" > {
                    submission.isGraded && gradingSubmission !== submission._id ? (<div className="graded-info" > <div className="grade-display" > <span className="grade" > 🎯 Grade: {
                        submission.marks
                    }

                        / {
                            assignment.totalMarks
                        }

                        <span className="percentage" > ({
                            Math.round((submission.marks / assignment.totalMarks) * 100)
                        }

                            %) </span> </span> <span className="graded-date" > 📅 Graded: {
                                new Date(submission.gradedAt).toLocaleDateString()
                            }

                        </span> </div> {
                            submission.feedback && (<div className="feedback" > <strong>💭 Feedback:</strong> <p> {
                                submission.feedback
                            }

                            </p> </div>)
                        }

                        <button className="btn btn-sm btn-outline"

                            onClick={
                                () => startGrading(submission)
                            }

                        > ✏️ Edit Grade </button> </div>) : gradingSubmission === submission._id ? (<div className="grading-form" > <div className="form-group" > <label>Marks (out of {
                            assignment.totalMarks
                        }) *</label> <input type="number"

                            value={
                                marks
                            }

                            onChange={
                                (e) => setMarks(e.target.value)
                            }

                            min="0"

                            max={
                                assignment.totalMarks
                            }

                            required /> </div> <div className="form-group" > <label>Feedback</label> <textarea value={
                                feedback
                            }

                                onChange={
                                    (e) => setFeedback(e.target.value)
                                }

                                rows="3"
                                placeholder="Provide feedback to the student..."

                            /> </div> <div className="form-actions" > <button className="btn btn-primary"
                                onClick={
                                    () => handleGradeSubmit(submission._id)
                                }

                                disabled={
                                    !marks
                                }

                            > 💾 Save Grade </button> <button className="btn btn-secondary"

                                onClick={
                                    cancelGrading
                                }

                            > ❌ Cancel </button> </div> </div>) : (<button className="btn btn-primary"

                                onClick={
                                    () => startGrading(submission)
                                }

                            > 📝 Grade Submission </button>)
                }

                </div> </div>)))
        }

        </div> <div className="modal-footer" > <div className="submissions-summary" > <span>📊 Total Submissions: {
            submissions.length
        }

        </span> <span>✅ Graded: {
            submissions.filter(s => s.isGraded).length
        }

            </span> <span>⏳ Pending: {
                submissions.filter(s => !s.isGraded).length
            }

            </span> </div> </div> </div> </div>);
}

export default Assignments;