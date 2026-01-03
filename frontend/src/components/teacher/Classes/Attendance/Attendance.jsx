import React, { useState, useEffect } from 'react';
import {
    Users,
    Clock,
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle,
    Play,
    Save,
    Eye,
    History,
    User,
    MapPin,
    BookOpen,
    BarChart3,
    Filter,
    Download,
    Edit3,
    Trash2
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    CardActionArea,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    IconButton,
    Chip,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Tab,
    Tabs,
    Modal,
    Backdrop,
    Fade
} from '@mui/material';
import {
    Search,
    Clear,
    Person,
    School,
    CalendarToday,
    Class as ClassIcon,
    People as PeopleIcon,
    Assignment as AssignmentIcon,
    Announcement as AnnouncementIcon,
    ArrowBack
} from '@mui/icons-material';
import Navbar from '../../../common/Navbar';
import './Attendance.css';

const Attendance = () => {
    const [todayLectures, setTodayLectures] = useState([]);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [currentAttendance, setCurrentAttendance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        subject: ''
    });

    const navigate = useNavigate();

    const location = useLocation();
    const classData = location.state?.classData?.[0];
    const classId = location.state?.classId || classData?._id;
    const className = location.state?.className || classData?.name;

    useEffect(() => {
        if (classId) {
            fetchTodayLectures();
            fetchAttendanceHistory();
        }
    }, [classId]);

    const fetchTodayLectures = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `http://localhost:5000/api/teacher/attendance/today-lectures?classId=${classId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = await response.json();
            if (result.success) {
                setTodayLectures(result.data.lectures);
                setError('');
            } else {
                setError(result.error || 'Failed to fetch today\'s lectures');
            }
        } catch (error) {
            console.error('Error fetching today\'s lectures:', error);
            setError('Failed to fetch today\'s lectures');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceHistory = async () => {
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.subject) queryParams.append('subject', filters.subject);

            const response = await fetch(
                `http://localhost:5000/api/teacher/attendance/class/${classId}/history?${queryParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = await response.json();
            if (result.success) {
                setAttendanceHistory(result.data.history);
            }
        } catch (error) {
            console.error('Error fetching attendance history:', error);
        }
    };

    const startAttendance = async (timetableEntryId) => {
        try {
            setLoading(true);

            console.log('a', classData)
            const lecture = todayLectures.find(l => l._id === timetableEntryId);

            if (!lecture) {
                setError('Lecture not found');
                return;
            }

            const attendanceData = {
                _id: null,
                timetableEntryId,
                classId,
                subject: lecture.subject,
                timeSlot: lecture.time,
                room: lecture.room,
                date: new Date(),
                isCompleted: false,
                notes: '',
                records: classData.students.map(student => ({
                    student: {
                        _id: student._id,
                        name: student.name,
                        email: student.email
                    },
                    status: 'absent',
                    markedAt: null,
                    notes: ''
                }))
            };

            setCurrentAttendance(attendanceData);
            setShowAttendanceModal(true);
            setError('');

        } catch (error) {
            console.error('Error preparing attendance:', error);
            setError('Failed to prepare attendance');
        } finally {
            setLoading(false);
        }
    };

    const viewAttendance = async (attendanceId) => {
        try {
            setLoading(true);
            const response = await fetch(
                `http://localhost:5000/api/teacher/attendance/${attendanceId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = await response.json();
            if (result.success) {
                setCurrentAttendance(result.data);
                setShowAttendanceModal(true);
                setError('');
            } else {
                setError(result.error || 'Failed to fetch attendance');
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            setError('Failed to fetch attendance');
        } finally {
            setLoading(false);
        }
    };

    const getLectureStatusIcon = (lecture) => {
        if (lecture.hasAttendance) {
            return lecture.attendanceStatus === 'completed'
                ? <CheckCircle className="status-icon completed" />
                : <AlertCircle className="status-icon pending" />;
        }

        if (lecture.canTakeAttendance) {
            return <Play className="status-icon can-start" />;
        }

        return <Clock className="status-icon waiting" />;
    };

    const getLectureStatusText = (lecture) => {
        if (lecture.hasAttendance) {
            return lecture.attendanceStatus === 'completed' ? 'Completed' : 'In Progress';
        }

        if (lecture.canTakeAttendance) {
            return lecture.isOngoing ? 'Ongoing - Take Attendance' : 'Ready to Start';
        }

        return 'Not Started Yet';
    };

    const getLectureStatusClass = (lecture) => {
        if (lecture.hasAttendance) {
            return lecture.attendanceStatus === 'completed' ? 'completed' : 'in-progress';
        }

        if (lecture.canTakeAttendance) {
            return lecture.isOngoing ? 'ongoing' : 'ready';
        }

        return 'waiting';
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    if (loading && todayLectures.length === 0) {
        return (
            <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <Navbar />
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress size={60} thickness={4} />
                </Box>
            </Box>
        );
    }

    const handleBackClick = () => {
        navigate(-1);
    };

    return (
        <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Navbar />
            <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>
                <Box sx={{ mb: 2 }}>
                    <Button
                        onClick={handleBackClick}
                        startIcon={<ArrowBack size={20} />}
                        variant="outlined"
                        sx={{
                            textTransform: 'none',
                            color: '#64748b',
                            borderColor: '#e2e8f0',
                            '&:hover': {
                                borderColor: '#cbd5e1',
                                backgroundColor: '#f1f5f9'
                            }
                        }}
                    >
                        Back to Class
                    </Button>
                </Box>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2', mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Users size={32} />
                        Attendance Management
                        {className && <Chip label={className} color="primary" variant="outlined" />}
                    </Box>
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 3,
                            borderRadius: 2,
                            '& .MuiAlert-icon': {
                                fontSize: '1.5rem'
                            }
                        }}
                    >
                        {error}
                    </Alert>
                )}

                <Paper sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={activeTab} onChange={handleTabChange} aria-label="attendance tabs">
                            <Tab
                                icon={<Calendar size={16} />}
                                label="Today's Lectures"
                                iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 500 }}
                            />
                            <Tab
                                icon={<History size={16} />}
                                label="Attendance History"
                                iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 500 }}
                            />
                        </Tabs>
                    </Box>

                    {activeTab === 0 && (
                        <Box sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Clock size={20} />
                                    Today's Lectures
                                </Typography>
                                <Chip
                                    label={`Current Time: ${new Date().toLocaleTimeString()}`}
                                    variant="outlined"
                                    color="primary"
                                />
                            </Box>

                            {todayLectures.length === 0 ? (
                                <Paper sx={{
                                    p: 4,
                                    textAlign: 'center',
                                    borderRadius: 2,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}>
                                    <Calendar size={48} />
                                    <Typography variant="h6" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
                                        No Lectures Today
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        There are no scheduled lectures for today in this class.
                                    </Typography>
                                </Paper>
                            ) : (
                                <Grid container spacing={3}>
                                    {todayLectures.map((lecture) => (
                                        <Grid item xs={12} sm={6} md={4} key={lecture._id}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    transition: 'all 0.3s ease',
                                                    borderLeft: `4px solid ${getLectureStatusClass(lecture) === 'completed' ? '#10b981' :
                                                        getLectureStatusClass(lecture) === 'in-progress' ? '#f59e0b' :
                                                            getLectureStatusClass(lecture) === 'ongoing' ? '#3b82f6' :
                                                                getLectureStatusClass(lecture) === 'ready' ? '#8b5cf6' : '#6b7280'
                                                        }`,
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <BookOpen size={18} />
                                                                {lecture.subject}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Clock size={14} />
                                                                    <Typography variant="body2" color="textSecondary">{lecture.time}</Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <MapPin size={14} />
                                                                    <Typography variant="body2" color="textSecondary">{lecture.room}</Typography>
                                                                </Box>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Users size={14} />
                                                                    <Typography variant="body2" color="textSecondary">{lecture.class.studentCount} Students</Typography>
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                                            {getLectureStatusIcon(lecture)}
                                                            <Typography variant="caption" sx={{ textAlign: 'right', fontWeight: 500 }}>
                                                                {getLectureStatusText(lecture)}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    <Box sx={{ mt: 'auto', pt: 2 }}>
                                                        {lecture.hasAttendance ? (
                                                            <Button
                                                                onClick={() => viewAttendance(lecture.attendanceId)}
                                                                variant="outlined"
                                                                startIcon={<Eye size={16} />}
                                                                fullWidth
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                View Attendance
                                                            </Button>
                                                        ) : lecture.canTakeAttendance ? (
                                                            <Button
                                                                onClick={() => startAttendance(lecture._id)}
                                                                variant="contained"
                                                                startIcon={<Play size={16} />}
                                                                fullWidth
                                                                disabled={loading}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                Start Attendance
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="outlined"
                                                                startIcon={<Clock size={16} />}
                                                                fullWidth
                                                                disabled
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                Wait for Lecture Time
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box sx={{ p: 3 }}>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <History size={20} />
                                    Attendance History
                                </Typography>
                            </Box>

                            {/* History Filters */}
                            <Paper sx={{
                                mb: 3,
                                p: 3,
                                borderRadius: 2,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="Start Date"
                                            value={filters.startDate}
                                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                            InputLabelProps={{ shrink: true }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="End Date"
                                            value={filters.endDate}
                                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                            InputLabelProps={{ shrink: true }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Filter by Subject"
                                            value={filters.subject}
                                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                                            placeholder="Enter subject name"
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <Button
                                            onClick={fetchAttendanceHistory}
                                            variant="contained"
                                            startIcon={<Filter size={16} />}
                                            fullWidth
                                            sx={{ textTransform: 'none', height: '56px' }}
                                        >
                                            Apply Filters
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {attendanceHistory.length === 0 ? (
                                <Paper sx={{
                                    p: 4,
                                    textAlign: 'center',
                                    borderRadius: 2,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}>
                                    <History size={48} />
                                    <Typography variant="h6" color="textSecondary" gutterBottom sx={{ mt: 2 }}>
                                        No Attendance Records
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        No attendance records found for the selected criteria.
                                    </Typography>
                                </Paper>
                            ) : (
                                <Grid container spacing={3}>
                                    {attendanceHistory.map((record) => (
                                        <Grid item xs={12} md={6} lg={4} key={record._id}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: 3 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                            {record.subject}
                                                        </Typography>
                                                        <Chip
                                                            label={record.isCompleted ? 'Completed' : 'Pending'}
                                                            color={record.isCompleted ? 'success' : 'warning'}
                                                            size="small"
                                                        />
                                                    </Box>

                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                                            <strong>Date:</strong> {new Date(record.date).toLocaleDateString()}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                                            <strong>Time:</strong> {record.timeSlot}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                                                            <strong>Room:</strong> {record.room}
                                                        </Typography>
                                                    </Box>

                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                        <Box sx={{ textAlign: 'center' }}>
                                                            <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                                                                {record.presentCount}
                                                            </Typography>
                                                            <Typography variant="caption" color="textSecondary">Present</Typography>
                                                        </Box>
                                                        <Box sx={{ textAlign: 'center' }}>
                                                            <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
                                                                {record.absentCount}
                                                            </Typography>
                                                            <Typography variant="caption" color="textSecondary">Absent</Typography>
                                                        </Box>
                                                        <Box sx={{ textAlign: 'center' }}>
                                                            <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                                                                {record.lateCount}
                                                            </Typography>
                                                            <Typography variant="caption" color="textSecondary">Late</Typography>
                                                        </Box>
                                                    </Box>

                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Total: {record.totalStudents}
                                                        </Typography>
                                                        <Chip
                                                            label={`${record.attendancePercentage}%`}
                                                            color={
                                                                record.attendancePercentage >= 75 ? 'success' :
                                                                    record.attendancePercentage >= 50 ? 'warning' : 'error'
                                                            }
                                                            size="small"
                                                        />
                                                    </Box>

                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Button
                                                            onClick={() => viewAttendance(record._id)}
                                                            variant="outlined"
                                                            startIcon={<Eye size={14} />}
                                                            size="small"
                                                            sx={{ textTransform: 'none', flex: 1 }}
                                                        >
                                                            View
                                                        </Button>
                                                        <Button
                                                            onClick={() => viewAttendance(record._id)}
                                                            variant="outlined"
                                                            startIcon={<Edit3 size={14} />}
                                                            size="small"
                                                            sx={{ textTransform: 'none', flex: 1 }}
                                                        >
                                                            Edit
                                                        </Button>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Box>
                    )}
                </Paper>

                {/* Attendance Modal */}
                <Modal
                    open={showAttendanceModal}
                    onClose={() => {
                        setShowAttendanceModal(false);
                        setCurrentAttendance(null);
                        fetchTodayLectures();
                        fetchAttendanceHistory();
                    }}
                    closeAfterTransition
                    BackdropComponent={Backdrop}
                    BackdropProps={{
                        timeout: 500,
                    }}
                >
                    <Fade in={showAttendanceModal}>
                        <Box sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '90vw',
                            maxWidth: 900,
                            maxHeight: '90vh',
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            boxShadow: 24,
                            overflow: 'auto'
                        }}>
                            {currentAttendance && (
                                <AttendanceModal
                                    attendance={currentAttendance}
                                    onClose={() => {
                                        setShowAttendanceModal(false);
                                        setCurrentAttendance(null);
                                        fetchTodayLectures();
                                        fetchAttendanceHistory();
                                    }}
                                    onUpdate={(updatedAttendance) => {
                                        setCurrentAttendance(updatedAttendance);
                                    }}
                                />
                            )}
                        </Box>
                    </Fade>
                </Modal>
            </Container>
        </Box>
    );
};

const AttendanceModal = ({ attendance, onClose, onUpdate }) => {
    const [attendanceRecords, setAttendanceRecords] = useState(attendance.records || []);
    const [notes, setNotes] = useState(attendance.notes || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const updateAttendanceStatus = (studentId, status) => {
        setAttendanceRecords(records =>
            records.map(record =>
                record.student._id === studentId
                    ? { ...record, status, markedAt: new Date() }
                    : record
            )
        );
    };

    const saveAttendance = async (isCompleted = false) => {
        try {
            setLoading(true);
            setError('');

            const recordsToUpdate = attendanceRecords.map(record => ({
                studentId: record.student._id,
                status: record.status,
                notes: record.notes || ''
            }));

            let response;

            if (attendance._id) {
                response = await fetch(
                    `http://localhost:5000/api/teacher/attendance/${attendance._id}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            records: recordsToUpdate,
                            notes,
                            isCompleted
                        })
                    }
                );
            } else {
                response = await fetch(
                    'http://localhost:5000/api/teacher/attendance/start',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            timetableEntryId: attendance.timetableEntryId,
                            classId: attendance.classId,
                            records: recordsToUpdate,
                            notes,
                            isCompleted
                        })
                    }
                );
            }

            const result = await response.json();
            if (result.success) {
                onUpdate(result.data);
                if (isCompleted) {
                    onClose();
                }
            } else {
                setError(result.error || 'Failed to save attendance');
            }
        } catch (error) {
            console.error('Error saving attendance:', error);
            setError('Failed to save attendance');
        } finally {
            setLoading(false);
        }
    };

    const markAllPresent = () => {
        setAttendanceRecords(records =>
            records.map(record => ({ ...record, status: 'present', markedAt: new Date() }))
        );
    };

    const markAllAbsent = () => {
        setAttendanceRecords(records =>
            records.map(record => ({ ...record, status: 'absent', markedAt: new Date() }))
        );
    };

    const filteredRecords = attendanceRecords.filter(record => {
        const matchesSearch = record.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.student.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusCounts = () => {
        const present = attendanceRecords.filter(r => r.status === 'present').length;
        const absent = attendanceRecords.filter(r => r.status === 'absent').length;
        const late = attendanceRecords.filter(r => r.status === 'late').length;
        const total = attendanceRecords.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return { present, absent, late, total, percentage };
    };

    const stats = getStatusCounts();

    return (
        <Box sx={{ p: 3 }}>

            {/* Modal Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Users size={20} />
                        Take Attendance
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Chip label={attendance.subject} color="primary" size="small" />
                        <Chip label={attendance.timeSlot} variant="outlined" size="small" />
                        <Chip label={new Date(attendance.date).toLocaleDateString()} variant="outlined" size="small" />
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
                    <Clear />
                </IconButton>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <CheckCircle size={24} color="#10b981" />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#166534' }}>
                            {stats.present}
                        </Typography>
                        <Typography variant="caption" color="#166534">Present</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                        <XCircle size={24} color="#ef4444" />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#991b1b' }}>
                            {stats.absent}
                        </Typography>
                        <Typography variant="caption" color="#991b1b">Absent</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fed7aa' }}>
                        <AlertCircle size={24} color="#f59e0b" />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#92400e' }}>
                            {stats.late}
                        </Typography>
                        <Typography variant="caption" color="#92400e">Late</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <BarChart3 size={24} color="#1d4ed8" />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1d4ed8' }}>
                            {stats.percentage}%
                        </Typography>
                        <Typography variant="caption" color="#1d4ed8">Attendance</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Controls */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Filter Status</InputLabel>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                label="Filter Status"
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value="all">All Students</MenuItem>
                                <MenuItem value="present">Present</MenuItem>
                                <MenuItem value="absent">Absent</MenuItem>
                                <MenuItem value="late">Late</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                onClick={markAllPresent}
                                variant="outlined"
                                color="success"
                                size="small"
                                sx={{ textTransform: 'none', flex: 1 }}
                            >
                                All Present
                            </Button>
                            <Button
                                onClick={markAllAbsent}
                                variant="outlined"
                                color="error"
                                size="small"
                                sx={{ textTransform: 'none', flex: 1 }}
                            >
                                All Absent
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Students List */}
            <Paper sx={{ maxHeight: 400, overflow: 'auto', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                {filteredRecords.map((record) => (
                    <Box
                        key={record.student._id}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,
                            borderBottom: '1px solid #e2e8f0',
                            bgcolor: record.status === 'present' ? '#f0fdf4' :
                                record.status === 'absent' ? '#fef2f2' :
                                    record.status === 'late' ? '#fffbeb' : 'white',
                            borderLeft: `4px solid ${record.status === 'present' ? '#10b981' :
                                record.status === 'absent' ? '#ef4444' :
                                    record.status === 'late' ? '#f59e0b' : 'transparent'
                                }`,
                            '&:hover': { bgcolor: '#f9fafb' },
                            '&:last-child': { borderBottom: 'none' }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: '#e2e8f0', color: '#64748b' }}>
                                <User size={20} />
                            </Avatar>
                            <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                    {record.student.name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {record.student.email}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                onClick={() => updateAttendanceStatus(record.student._id, 'present')}
                                variant={record.status === 'present' ? 'contained' : 'outlined'}
                                color="success"
                                size="small"
                                startIcon={<CheckCircle size={16} />}
                                sx={{ textTransform: 'none', minWidth: 80 }}
                            >
                                Present
                            </Button>
                            <Button
                                onClick={() => updateAttendanceStatus(record.student._id, 'late')}
                                variant={record.status === 'late' ? 'contained' : 'outlined'}
                                color="warning"
                                size="small"
                                startIcon={<AlertCircle size={16} />}
                                sx={{ textTransform: 'none', minWidth: 80 }}
                            >
                                Late
                            </Button>
                            <Button
                                onClick={() => updateAttendanceStatus(record.student._id, 'absent')}
                                variant={record.status === 'absent' ? 'contained' : 'outlined'}
                                color="error"
                                size="small"
                                startIcon={<XCircle size={16} />}
                                sx={{ textTransform: 'none', minWidth: 80 }}
                            >
                                Absent
                            </Button>
                        </Box>
                    </Box>
                ))}
            </Paper>

            {/* Notes Section */}
            <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                    Additional Notes
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about this attendance session..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
            </Box>

            {/* Modal Actions */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
                mt: 3,
                pt: 2,
                borderTop: '1px solid #e2e8f0'
            }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => saveAttendance(false)}
                    variant="outlined"
                    startIcon={<Save size={16} />}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                >
                    Save Draft
                </Button>
                <Button
                    onClick={() => saveAttendance(true)}
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle size={16} />}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                >
                    {loading ? 'Completing...' : 'Complete Attendance'}
                </Button>
            </Box>
        </Box>
    );
};

export default Attendance;
