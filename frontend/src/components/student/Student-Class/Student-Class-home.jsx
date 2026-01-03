import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Tabs,
    Tab,
    Card,
    CardContent,
    Button,
    CircularProgress,
    Alert,
    Chip,
    CardActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
} from '@mui/material';
import Navbar from '../../common/Navbar';
import {
    Class as ClassIcon,
    Assignment as AssignmentIcon,
    People as PeopleIcon,
    Schedule as ScheduleIcon,
    Announcement as AnnouncementIcon,
    Grade as GradeIcon,
    MenuBook as MenuBookIcon,
    CheckCircle as CheckCircleIcon,
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
    School as SchoolIcon,
    Room as RoomIcon,
    Today as TodayIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    AttachFile as AttachFileIcon,
    EventAvailable as EventAvailableIcon,
    EventBusy as EventBusyIcon,
    Schedule as ScheduleOutlinedIcon,
} from '@mui/icons-material';
import { Clock, MapPin, User, Calendar, BookOpen } from 'lucide-react';

function StudentClassHome() {
    const location = useLocation();
    const navigate = useNavigate();
    const { classname } = useParams();
    const { token } = useSelector((state) => state.auth);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);

    const [announcements, setAnnouncements] = useState([]);
    const [resources, setResources] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState({
        totalClasses: 0,
        attendedClasses: 0,
        attendancePercentage: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0
    });

    const [assignmentformData, setassginmentFormData] = useState({ attachments: [] });

    const classDetails = location.state?.classDetails;
    const classId = location.state?.classId;
    const className = location.state?.className;

    // Days of the week for timetable display
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Quick stats data
    const [stats, setStats] = useState({
        totalAnnouncements: 0,
        totalAssignments: 0,
        pendingAssignments: 0,
        totalResources: 0,
        attendancePercentage: 0
    });

    useEffect(() => {
        // Fetch class data when component mounts
        if (classId && classDetails) {
            fetchannouncements();
            fetchResources();
            fetchAssignments();
            fetchTimetable();
            fetchAttendance();
        }
    }, [classId, classDetails]);


    const fetchAttendance = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/student/attendance/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log(response.data);

            setAttendance(response.data);

            // Calculate attendance statistics
            const totalClasses = response.data.length;
            const presentClasses = response.data.filter(record => record.status === 'present').length;
            const lateClasses = response.data.filter(record => record.status === 'late').length;
            const absentClasses = response.data.filter(record => record.status === 'absent').length;
            const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

            setAttendanceStats({
                totalClasses,
                attendedClasses: presentClasses,
                attendancePercentage,
                presentDays: presentClasses,
                absentDays: absentClasses,
                lateDays: lateClasses
            });

        } catch (error) {
            console.error('Error fetching attendance:', error);
            setAttendance([]);
        }
    };

    const fetchTimetable = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/student/timetable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ classId: classId })
            });

            if (response.ok) {
                const data = await response.json();
                setTimetable(data);
            } else {
                console.error('Failed to fetch timetable');
                setTimetable([]);
            }
        } catch (error) {
            console.error('Error fetching timetable:', error);
            setTimetable([]);
        }
    };

    const fetchAssignments = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/student/assignments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ classId: classId })
            });
            const data = await response.json();

            const formatted = data.map(assignment => ({
                id: assignment.id,
                title: assignment.title,
                instructions: assignment.instructions,
                description: assignment.description,
                uploadDate: assignment.uploadDate,
                dueDate: assignment.dueDate,
                teacher: assignment.teacherName || 'Unknown',
                totalmarks: assignment.totalmarks,
                status: assignment.status,
                attachments: assignment.attachments || [],
                submissionDetails: assignment.submissionDetails || null
            }));

            setAssignments(formatted);

            // Update stats
            setStats(prev => ({
                ...prev,
                totalAssignments: formatted.length,
                pendingAssignments: formatted.filter(a => a.status === 'pending').length
            }));

        } catch (error) {
            console.error('Error fetching Assignments:', error);
            setAssignments([]);
        }
    };

    const fetchResources = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/student/getResources', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ classId: classId })
            });
            const data = await response.json();

            const formatted = data.map(resource => ({
                id: resource.id,
                title: resource.title,
                description: resource.description,
                uploadDate: resource.uploadDate,
                teacher: resource.teacherName || 'Unknown',
                filename: resource.filename || null,
                filesize: resource.filesize || null,
                subject: resource.subject
            }));

            setResources(formatted);

            // Update stats
            setStats(prev => ({
                ...prev,
                totalResources: formatted.length
            }));

        } catch (error) {
            console.error('Error fetching Resource:', error);
            setResources([]);
        }
    };

    const downloadResource = async (resourceId, filename) => {
        try {
            const response = await fetch(`http://localhost:5000/api/student/resources/${resourceId}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    const fetchannouncements = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/student/announcements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ classId: classId })
            });
            const data = await response.json();

            const formatted = data.map(announcement => ({
                id: announcement.id,
                title: announcement.title,
                content: announcement.content,
                date: announcement.createdAt,
                teacher: announcement.teacherName || 'Unknown',
                priority: announcement.priority || 'normal',
                attachments: announcement.attachments || []
            }));

            setAnnouncements(formatted);

            // Update stats
            setStats(prev => ({
                ...prev,
                totalAnnouncements: formatted.length
            }));

        } catch (error) {
            console.error('Error fetching announcements:', error);
            setAnnouncements([]);
        }
    };

    const handleFileChange = (e) => {
        setassginmentFormData(prev => ({
            ...prev,
            attachments: Array.from(e.target.files)
        }));
    };

    const resetForm = () => {
        setassginmentFormData({ attachments: [] });
    };

    const submitassignment = async (id) => {
        if (assignmentformData.attachments.length === 0) {
            alert('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('ass_id', id);
        formData.append('file', assignmentformData.attachments[0]);

        try {
            const response = await fetch(`http://localhost:5000/api/student/submit-assignment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                alert('Assignment submitted successfully!');
                resetForm();
                fetchAssignments();
            } else {
                alert(data.error || 'Submission failed.');
            }
        } catch (error) {
            console.error('Error submitting assignment:', error);
            alert('Error submitting assignment.');
        }
    };

    const handleTabChange = useCallback((event, newValue) => {
        setTabValue(newValue);
    }, []);

    const getAttendanceColor = (status) => {
        switch (status) {
            case 'present': return 'success';
            case 'late': return 'warning';
            case 'absent': return 'error';
            default: return 'default';
        }
    };

    const getAttendanceIcon = (status) => {
        switch (status) {
            case 'present': return <CheckCircleIcon color="success" />;
            case 'late': return <AccessTimeIcon color="warning" />;
            case 'absent': return <EventBusyIcon color="error" />;
            default: return <EventAvailableIcon />;
        }
    };

    // Render functions for each tab
    const renderOverview = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Class Overview
            </Typography>

            {/* Recent Announcements */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AnnouncementIcon color="primary" />
                        Recent Announcements
                    </Typography>
                    {announcements.slice(0, 3).map(announcement => (
                        <Box key={announcement.id} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {announcement.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {announcement.content.substring(0, 100)}...
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                By: {announcement.teacher} • {new Date(announcement.date).toLocaleDateString()}
                            </Typography>
                        </Box>
                    ))}
                    <Button variant="outlined" onClick={() => setTabValue(1)}>
                        View All Announcements
                    </Button>
                </CardContent>
            </Card>

            {/* Pending Assignments */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentIcon color="primary" />
                        Pending Assignments
                    </Typography>
                    {assignments.filter(a => a.status === 'pending').slice(0, 3).map(assignment => (
                        <Box key={assignment.id} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {assignment.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Teacher: {assignment.teacher}
                            </Typography>
                        </Box>
                    ))}
                    <Button variant="outlined" onClick={() => setTabValue(4)}>
                        View All Assignments
                    </Button>
                </CardContent>
            </Card>
        </Box>
    );

    const renderAnnouncements = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Class Announcements
            </Typography>
            <Grid container spacing={3}>
                {announcements.map(announcement => (
                    <Grid item xs={12} key={announcement.id}>
                        <Card sx={{ borderLeft: `4px solid ${announcement.priority === 'high' ? '#f44336' : announcement.priority === 'medium' ? '#ff9800' : '#4caf50'}` }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        {announcement.title}
                                    </Typography>
                                    <Chip
                                        label={announcement.priority.toUpperCase()}
                                        size="small"
                                        color={announcement.priority === 'high' ? 'error' : announcement.priority === 'medium' ? 'warning' : 'success'}
                                    />
                                </Box>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    {announcement.content}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" color="textSecondary">
                                        By: {announcement.teacher} • {new Date(announcement.date).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                {announcement.attachments && announcement.attachments.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Attachments:
                                        </Typography>
                                        {announcement.attachments.map((attachment, index) => (
                                            <Button
                                                key={index} 
                                                startIcon={<AttachFileIcon />}
                                                href={`http://localhost:5000${attachment.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ mr: 1, mb: 1 }}
                                            >
                                                {attachment.originalName}
                                            </Button>
                                        ))}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );

    const renderTimetable = () => {
        // Group timetable entries by day and time
        const timetableByDay = {};
        const timeSlots = new Set();

        timetable.forEach(entry => {
            if (!timetableByDay[entry.day]) {
                timetableByDay[entry.day] = {};
            }
            timetableByDay[entry.day][entry.time] = entry;
            timeSlots.add(entry.time);
        });

        // Sort time slots
        const sortedTimeSlots = Array.from(timeSlots).sort((a, b) => {
            const timeA = a.split(' - ')[0];
            const timeB = b.split(' - ')[0];
            return timeA.localeCompare(timeB);
        });

        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="primary" />
                    Weekly Timetable
                </Typography>
                {timetable.length === 0 ? (
                    <Alert severity="info">
                        No timetable available for this class.
                    </Alert>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                                    {daysOfWeek.map(day => (
                                        <TableCell key={day} sx={{ fontWeight: 'bold' }}>{day}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedTimeSlots.map(timeSlot => (
                                    <TableRow key={timeSlot}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>{timeSlot}</TableCell>
                                        {daysOfWeek.map(day => {
                                            const period = timetableByDay[day]?.[timeSlot];
                                            return (
                                                <TableCell key={`${day}-${timeSlot}`}>
                                                    {period ? (
                                                        <Card sx={{ minHeight: 80, bgcolor: period.color || '#e3f2fd' }}>
                                                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                                    {period.subject}
                                                                </Typography>
                                                                <Typography variant="caption" display="block">
                                                                    {period.teacher}
                                                                </Typography>
                                                                <Typography variant="caption" display="block">
                                                                    Room: {period.room}
                                                                </Typography>
                                                            </CardContent>
                                                        </Card>
                                                    ) : (
                                                        <Box sx={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            -
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        );
    };

    const renderResources = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MenuBookIcon color="primary" />
                Study Resources
            </Typography>
            <Grid container spacing={3}>
                {resources.map(resource => (
                    <Grid item xs={12} sm={6} md={4} key={resource.id}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {resource.title}
                                </Typography>
                                {resource.description && (
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                        {resource.description}
                                    </Typography>
                                )}
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Subject:</strong> {resource.subject}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Uploaded: {new Date(resource.uploadDate).toLocaleDateString()}
                                </Typography>
                                <br />
                                <Typography variant="caption" color="textSecondary">
                                    By: {resource.teacher}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button
                                    size="small"
                                    startIcon={<DownloadIcon />}
                                    onClick={() => downloadResource(resource.id, resource.filename)}
                                >
                                    Download
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );

    const renderAssignments = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon color="primary" />
                Assignments
            </Typography>
            <Grid container spacing={3}>
                {assignments.map(assignment => (
                    <Grid item xs={12} key={assignment.id}>
                        <Card sx={{ borderLeft: `4px solid ${assignment.status === 'pending' ? '#ff9800' : '#4caf50'}` }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        {assignment.title}
                                    </Typography>
                                    <Chip
                                        label={assignment.status.toUpperCase()}
                                        color={assignment.status === 'pending' ? 'warning' : 'success'}
                                    />
                                </Box>

                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Instructions:</strong> {assignment.instructions}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Description:</strong> {assignment.description}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Due Date:</strong> {new Date(assignment.dueDate).toLocaleDateString()}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Teacher:</strong> {assignment.teacher}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    <strong>Total Marks:</strong> {assignment.totalmarks}
                                </Typography>

                                {assignment.attachments && assignment.attachments.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Assignment Files:
                                        </Typography>
                                        {assignment.attachments.map((attachment, index) => (
                                            <Button
                                                key={index}
                                                startIcon={<AttachFileIcon />}
                                                href={`http://localhost:5000${attachment.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ mr: 1, mb: 1 }}
                                            >
                                                {attachment.name}
                                            </Button>
                                        ))}
                                    </Box>
                                )}

                                {assignment.status === 'pending' && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Submit Assignment:
                                        </Typography>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.ppt,.pptx"
                                            style={{ marginBottom: '10px' }}
                                        />
                                        <br />
                                        <Button
                                            variant="contained"
                                            startIcon={<UploadIcon />}
                                            onClick={() => {
                                                submitassignment(assignment.id);
                                                resetForm();
                                            }}
                                            disabled={assignmentformData.attachments.length === 0}
                                        >
                                            Submit Assignment
                                        </Button>
                                    </Box>
                                )}

                                {assignment.status === 'submitted' && assignment.submissionDetails && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Submission Details:
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Submitted At:</strong> {new Date(assignment.submissionDetails.submittedAt).toLocaleString()}
                                        </Typography>
                                        {assignment.submissionDetails.isGraded ? (
                                            <Typography variant="body2">
                                                <strong>Feedback:</strong> {assignment.submissionDetails.feedback || 'No feedback provided'}
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="textSecondary">
                                                <strong>Status:</strong> Not Reviewed
                                            </Typography>
                                        )}
                                        {assignment.submissionDetails.submittedFiles?.length > 0 && (
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>Submitted Files:</strong>
                                                </Typography>
                                                {assignment.submissionDetails.submittedFiles.map((file, idx) => (
                                                    <Button
                                                        key={idx}
                                                        size="small"
                                                        startIcon={<AttachFileIcon />}
                                                        href={`http://localhost:5000${file.url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        sx={{ mr: 1, mb: 1 }}
                                                    >
                                                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                                    </Button>
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );

    const renderAttendance = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="primary" />
                My Attendance
            </Typography>

            {/* Attendance Statistics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {attendanceStats.attendancePercentage}%
                                    </Typography>
                                    <Typography variant="body2">
                                        Overall Attendance
                                    </Typography>
                                </Box>
                                <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)', color: 'white' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {attendanceStats.presentDays}
                                    </Typography>
                                    <Typography variant="body2">
                                        Present Days
                                    </Typography>
                                </Box>
                                <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', color: 'white' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {attendanceStats.lateDays}
                                    </Typography>
                                    <Typography variant="body2">
                                        Late Days
                                    </Typography>
                                </Box>
                                <AccessTimeIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)', color: 'white' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                        {attendanceStats.absentDays}
                                    </Typography>
                                    <Typography variant="body2">
                                        Absent Days
                                    </Typography>
                                </Box>
                                <EventBusyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Attendance Progress */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Attendance Progress
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={attendanceStats.attendancePercentage}
                                sx={{ height: 10, borderRadius: 5 }}
                                color={attendanceStats.attendancePercentage >= 75 ? 'success' : attendanceStats.attendancePercentage >= 50 ? 'warning' : 'error'}
                            />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                                {attendanceStats.attendancePercentage}%
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {attendanceStats.presentDays} out of {attendanceStats.totalClasses} classes attended
                    </Typography>
                </CardContent>
            </Card>

            {/* Detailed Attendance Records */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Attendance History
                    </Typography>
                    {attendance.length === 0 ? (
                        <Alert severity="info">
                            No attendance records found for this class.
                        </Alert>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Time Slot</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Day</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {attendance.map((record, index) => (
                                        <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <TodayIcon color="action" fontSize="small" />
                                                    {new Date(record.date).toLocaleDateString()}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <SchoolIcon color="primary" fontSize="small" />
                                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                        {record.subject || 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <ScheduleOutlinedIcon color="action" fontSize="small" />
                                                    <Typography variant="body2">
                                                        {record.timeSlot || 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {getAttendanceIcon(record.status)}
                                                    <Chip
                                                        label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                                        color={getAttendanceColor(record.status)}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {record.notes || '-'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );

    // Handle case where user navigates directly to URL without state
    if (!classDetails && !classId) {
        return (
            <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Navbar />
                <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Class not found. No class details found for: {classname}
                    </Alert>
                    <Button variant="contained" onClick={() => navigate('/student/dashboard')}>
                        Back to Dashboard
                    </Button>
                </Container>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Navbar />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                    <CircularProgress size={60} />
                </Box>
            </Box>
        );
    }

    // if (error) {
    //     return (
    //         <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
    //             <Navbar />
    //             <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>
    //                 <Alert severity="error" sx={{ mb: 2 }}>
    //                     {error}
    //                 </Alert>
    //                 <Button variant="contained" onClick={fetchAllData}>
    //                     Retry
    //                 </Button>
    //             </Container>
    //         </Box>
    //     );
    // }

    return (
        <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Navbar />
            <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>

                {/* Header Section */}
                <Box sx={{ mb: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/student/dashboard')}
                        sx={{ mb: 2 }}
                    >
                        ← Back to Classes
                    </Button>

                    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {className || classname}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip
                            label={`Announcements: ${stats.totalAnnouncements}`}
                            variant="outlined"
                        />
                        <Chip
                            label={`Assignments: ${stats.totalAssignments}`}
                            variant="outlined"
                        />
                        <Chip
                            label={`Resources: ${stats.totalResources}`}
                            variant="outlined"
                        />
                    </Box>
                </Box>

                {/* Quick Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {/* {stats.totalAnnouncements} */}
                                        </Typography>
                                        <Typography variant="body2">
                                            Announcements
                                        </Typography>
                                    </Box>
                                    <AnnouncementIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {stats.totalAssignments}
                                        </Typography>
                                        <Typography variant="body2">
                                            Total Assignments
                                        </Typography>
                                    </Box>
                                    <AssignmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {stats.pendingAssignments}
                                        </Typography>
                                        <Typography variant="body2">
                                            Pending
                                        </Typography>
                                    </Box>
                                    <AccessTimeIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#333' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {stats.totalResources}
                                        </Typography>
                                        <Typography variant="body2">
                                            Resources
                                        </Typography>
                                    </Box>
                                    <MenuBookIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', color: '#333' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {attendanceStats.attendancePercentage}%
                                        </Typography>
                                        <Typography variant="body2">
                                            Attendance
                                        </Typography>
                                    </Box>
                                    <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Main Content Tabs */}
                <Paper sx={{ borderRadius: 2 }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ClassIcon />
                                    Overview
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AnnouncementIcon />
                                    Announcements
                                    <Chip label={stats.totalAnnouncements} size="small" />
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ScheduleIcon />
                                    Timetable
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <MenuBookIcon />
                                    Resources
                                    <Chip label={stats.totalResources} size="small" />
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AssignmentIcon />
                                    Assignments
                                    <Chip label={stats.pendingAssignments} size="small" color="warning" />
                                </Box>
                            }
                        />
                       
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircleIcon />
                                    Attendance
                                    <Chip
                                        label={`${attendanceStats.attendancePercentage}%`}
                                        size="small"
                                        color={attendanceStats.attendancePercentage >= 75 ? 'success' : attendanceStats.attendancePercentage >= 50 ? 'warning' : 'error'}
                                    />
                                </Box>
                            }
                        />
                    </Tabs>

                    {/* Tab Content */}
                    {tabValue === 0 && renderOverview()}
                    {tabValue === 1 && renderAnnouncements()}
                    {tabValue === 2 && renderTimetable()}
                    {tabValue === 3 && renderResources()}
                    {tabValue === 4 && renderAssignments()}
                    {tabValue === 5 && renderAttendance()}
                </Paper>
            </Container>
        </Box>
    );
}

export default StudentClassHome;