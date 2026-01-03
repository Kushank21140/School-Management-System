import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
} from '@mui/material';
import Navbar from '../../common/Navbar';
import {
    Class as ClassIcon,
    Assignment as AssignmentIcon,
    People as PeopleIcon,
    Schedule as ScheduleIcon,
    Announcement as AnnouncementIcon,
    MenuBook as MenuBookIcon,
    Quiz as QuizIcon,
    CheckCircle as CheckCircleIcon,
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
    School as SchoolIcon,
    Room as RoomIcon,
    Today as TodayIcon,
} from '@mui/icons-material';

function ClassHome() {
    const location = useLocation();
    const navigate = useNavigate();
    const { token } = useSelector((state) => state.auth);

    const className = location.state?.className;
    const existingClassData = location.state?.classData;

    const [classData, setClassData] = useState(existingClassData || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalAssignments: 0,
        attendanceToday: 0
    });
    const [todayLectures, setTodayLectures] = useState({
        lectures: [],
        count: 0,
        day: '',
        date: ''
    });
    const [lecturesLoading, setLecturesLoading] = useState(false);

    // Navigation items data
    const navigationItems = useMemo(() => [
        {
            title: 'Timetable',
            description: 'View and manage class schedule',
            icon: <ScheduleIcon />,
            path: `/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/timetable`,
            color: '#4CAF50'
        },
        {
            title: 'Attendance',
            description: 'Track student attendance',
            icon: <CheckCircleIcon />,
            path: `/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/attendance`,
            color: '#2196F3'
        },
        {
            title: 'Assignments',
            description: 'Create and manage assignments',
            icon: <AssignmentIcon />,
            path: `/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/assignments`,
            color: '#FF9800'
        },
        {
            title: 'Student List',
            description: 'View enrolled students',
            icon: <PeopleIcon />,
            path: `/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/students`,
            color: '#00BCD4'
        },
        {
            title: 'Teacher List',
            description: 'View assigned teachers',
            icon: <SchoolIcon />,
            path: `/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/teachers`,
            color: '#795548'
        },
        {
            title: 'Announcements',
            description: 'Post class announcements',
            icon: <AnnouncementIcon />,
            path: `/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/announcements`,
            color: '#F44336'
        },
        {
            title: 'Resources',
            description: 'Share learning materials',
            icon: <MenuBookIcon />,
            path: `/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/resources`,
            color: '#8BC34A'
        }
    ], [className]);

    const fetchClass = useCallback(async (className) => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(`http://localhost:5000/api/teacher/class/${className}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setClassData(response.data.data);
                await fetchClassStats();
            }
        } catch (error) {
            console.error('Error fetching Classes:', error);
            setError(error.response?.data?.error || 'Failed to fetch class data');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchClassStats = useCallback(async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/teacher/class/${className}/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching class stats:', error);
        }
    }, [className, token]);

    const fetchTodayLectures = useCallback(async () => {
        try {
            setLecturesLoading(true);
            const response = await axios.get('http://localhost:5000/api/teacher/timetable/mylectures', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setTodayLectures(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching today\'s lectures:', error);
        } finally {
            setLecturesLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!className) {
            navigate('/teacher/classes');
            return;
        }

        if (existingClassData) {
            setClassData(existingClassData);
            fetchClassStats();
        } else {
            fetchClass(className);
        }

        // Fetch today's lectures
        fetchTodayLectures();
    }, [className, existingClassData, navigate, fetchClass, fetchClassStats, fetchTodayLectures]);

    // Helper functions
    const getClassYear = useCallback(() => {
        if (!classData || !classData[0]?.createdAt) return 'N/A';
        return new Date(classData[0].createdAt).getFullYear();
    }, [classData]);

    const getSubjectsCount = useCallback(() => {
        if (!classData || !classData[0]?.subjects) return 0;
        return classData[0].subjects.length;
    }, [classData]);

    const handleNavigation = useCallback((path) => {
        navigate(path, {
            state: {
                className,
                classData
            }
        });
    }, [navigate, className, classData]);

    const handleTabChange = useCallback((event, newValue) => {
        setTabValue(newValue);
    }, []);

    const formatTime = (timeString) => {
        // Convert "09:00 - 10:30" to more readable format
        return timeString;
    };

    const getNextLecture = () => {
        if (todayLectures.lectures.length === 0) return null;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes

        for (const lecture of todayLectures.lectures) {
            const lectureStartTime = lecture.timeStart.split(':');
            const lectureMinutes = parseInt(lectureStartTime[0]) * 60 + parseInt(lectureStartTime[1]);

            if (lectureMinutes > currentTime) {
                return lecture;
            }
        }
        return null;
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ mt: 4, p: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button variant="contained" onClick={() => fetchClass(className)}>
                    Retry
                </Button>
            </Box>
        );
    }

    const nextLecture = getNextLecture();

    return (
        <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Navbar />
            <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>

                {/* Header Section */}
                <Box sx={{ mb: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/teacher/dashboard')}
                        sx={{ mb: 2 }}
                    >
                        ← Back to Classes
                    </Button>

                    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {className}
                    </Typography>

                    {classData && (
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                                label={`Subjects: ${getSubjectsCount()}`}
                                variant="outlined"
                            />
                            <Chip
                                label={`Year: ${getClassYear()}`}
                                variant="outlined"
                            />
                        </Box>
                    )}
                </Box>

                {/* Quick Stats Cards */}
                <Grid container spacing={3} sx={{  mb: 4, justifyContent: 'space-between'}}>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {stats.totalStudents}
                                        </Typography>
                                        <Typography variant="body2">
                                            Total Students
                                        </Typography>
                                    </Box>
                                    <PeopleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
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
                                            {stats.totalTeachers}
                                        </Typography>
                                        <Typography variant="body2">
                                            Teachers
                                        </Typography>
                                    </Box>
                                    <SchoolIcon sx={{ fontSize: 40, opacity: 0.8 }} />
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
                                            {stats.totalAssignments}
                                        </Typography>
                                        <Typography variant="body2">
                                            Assignments
                                        </Typography>
                                    </Box>
                                    <AssignmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
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
                                            {stats.attendanceToday}%
                                        </Typography>
                                        <Typography variant="body2">
                                            Today's Attendance
                                        </Typography>
                                    </Box>
                                    <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* New Today's Lectures Card */}
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                            color: '#333'
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                            {lecturesLoading ? '...' : todayLectures.count}
                                        </Typography>
                                        <Typography variant="body2">
                                            Today's Lectures
                                        </Typography>
                                    </Box>
                                    <TodayIcon sx={{ fontSize: 40, opacity: 0.8 }} />
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
                    >
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ClassIcon />
                                    Class Management
                                    <Chip label={navigationItems.length} size="small" />
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TrendingUpIcon />
                                    Analytics
                                </Box>
                            }
                        />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ScheduleIcon />
                                    Today's Schedule
                                </Box>
                            }
                        />
                    </Tabs>

                    {/* Class Management Tab */}
                    {tabValue === 0 && (
                        <Box sx={{ p: 3 }}>
                            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                                Class Management Tools
                            </Typography>
                            <Grid container spacing={3}>
                                {navigationItems.map((item, index) => (
                                    <Grid item xs={12} sm={6} md={4} key={index}>
                                        <Card
                                            sx={{
                                                height: '100%',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                cursor: 'pointer',
                                                borderLeft: `4px solid ${item.color}`,
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: 4
                                                }
                                            }}
                                            onClick={() => handleNavigation(item.path)}
                                        >
                                            <CardContent>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                    <Box
                                                        sx={{
                                                            mr: 2,
                                                            color: item.color,
                                                            fontSize: '2rem'
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {item.title}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {item.description}
                                                </Typography>
                                            </CardContent>
                                            <CardActions>
                                                <Button
                                                    size="small"
                                                    sx={{ color: item.color }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNavigation(item.path);
                                                    }}
                                                >
                                                    Open →
                                                </Button>
                                            </CardActions>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Analytics Tab */}
                    {tabValue === 1 && (
                        <Box sx={{ p: 3 }}>
                            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                                Class Analytics & Overview
                            </Typography>

                            {/* Class Information Card */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card sx={{ height: '100%' }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <ClassIcon color="primary" />
                                                Class Information
                                            </Typography>

                                            {classData && classData[0] && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="body1" gutterBottom>
                                                        <strong>Class Name:</strong> {className}
                                                    </Typography>
                                                    <Typography variant="body1" gutterBottom>
                                                        <strong>Created:</strong> {new Date(classData[0].createdAt).toLocaleDateString()}
                                                    </Typography>
                                                    <Typography variant="body1" gutterBottom>
                                                        <strong>Academic Year:</strong> {getClassYear()}
                                                    </Typography>

                                                    {classData[0].subjects && classData[0].subjects.length > 0 && (
                                                        <Box sx={{ mt: 2 }}>
                                                            <Typography variant="body1" gutterBottom>
                                                                <strong>Subjects:</strong>
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                                                {classData[0].subjects.map((subject, index) => (
                                                                    <Chip
                                                                        key={index}
                                                                        label={subject}
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="primary"
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Card sx={{ height: '100%' }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TrendingUpIcon color="primary" />

                                                Attendance Analytics
                                            </Typography>

                                            <Box sx={{ mt: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>


                                                    <Typography variant="body1">Today's Attendance:</Typography>
                                                    <Typography 
                                                        variant="body1" 
                                                        sx={{ 
                                                            fontWeight: 'bold',
                                                            color: stats.attendanceToday >= 80 ? 'success.main' : 
                                                                   stats.attendanceToday >= 60 ? 'warning.main' : 'error.main'
                                                        }}
                                                    >
                                                        {stats.attendanceToday}%
                                                    </Typography>
                                                </Box>





                                                {stats.weeklyAttendance > 0 && (
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                                        <Typography variant="body1">Weekly Average:</Typography>
                                                        <Typography 
                                                            variant="body1" 
                                                            sx={{ 
                                                                fontWeight: 'bold',
                                                                color: stats.weeklyAttendance >= 80 ? 'success.main' : 
                                                                       stats.weeklyAttendance >= 60 ? 'warning.main' : 'error.main'
                                                            }}
                                                        >
                                                            {stats.weeklyAttendance}%
                                                        </Typography>
                                                    </Box>
                                                )}




                                                {stats.monthlyAttendance > 0 && (
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                                        <Typography variant="body1">Monthly Average:</Typography>
                                                        <Typography 
                                                            variant="body1" 
                                                            sx={{ 
                                                                fontWeight: 'bold',
                                                                color: stats.monthlyAttendance >= 80 ? 'success.main' : 
                                                                       stats.monthlyAttendance >= 60 ? 'warning.main' : 'error.main'
                                                            }}
                                                        >
                                                            {stats.monthlyAttendance}%
                                                        </Typography>
                                                    </Box>
                                                )}

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                                    <Typography variant="body1">Attendance Sessions:</Typography>
                                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                        {stats.completedAttendanceSessions || 0} / {stats.totalAttendanceSessions || 0}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                    
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* Today's Schedule Tab */}
                    {tabValue === 2 && (
                        <Box sx={{ p: 3 }}>
                            <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ScheduleIcon color="primary" />
                                Today's Lecture Schedule - {todayLectures.day}
                            </Typography>

                            {lecturesLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress size={40} />
                                </Box>
                            ) : (
                                <>
                                    {todayLectures.count > 0 ? (
                                        <Grid container spacing={3}>
                                            {/* Next Lecture Highlight */}
                                            {nextLecture && (
                                                <Grid item xs={12}>
                                                    <Alert
                                                        severity="info"
                                                        sx={{
                                                            mb: 2,
                                                            '& .MuiAlert-message': {
                                                                width: '100%'
                                                            }
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box>
                                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                                                    Next Lecture: {nextLecture.subject}
                                                                </Typography>
                                                                <Typography variant="body2">
                                                                    {nextLecture.class} • Room {nextLecture.room} • {nextLecture.time}
                                                                </Typography>
                                                            </Box>
                                                            <AccessTimeIcon />
                                                        </Box>
                                                    </Alert>
                                                </Grid>
                                            )}

                                            {/* All Today's Lectures */}
                                            <Grid item xs={12}>
                                                <Card>
                                                    <CardContent>
                                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <ScheduleIcon />
                                                            Complete Schedule ({todayLectures.count} lectures)
                                                        </Typography>

                                                        <List>
                                                            {todayLectures.lectures.map((lecture, index) => (
                                                                <React.Fragment key={lecture._id}>
                                                                    <ListItem
                                                                        sx={{
                                                                            bgcolor: nextLecture && nextLecture._id === lecture._id
                                                                                ? 'rgba(25, 118, 210, 0.08)'
                                                                                : 'transparent',
                                                                            borderRadius: 1,
                                                                            mb: 1,
                                                                            border: nextLecture && nextLecture._id === lecture._id
                                                                                ? '1px solid rgba(25, 118, 210, 0.2)'
                                                                                : '1px solid transparent'
                                                                        }}
                                                                    >
                                                                        <ListItemIcon>
                                                                            <Box
                                                                                sx={{
                                                                                    width: 40,
                                                                                    height: 40,
                                                                                    borderRadius: '50%',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    bgcolor: nextLecture && nextLecture._id === lecture._id
                                                                                        ? 'primary.main'
                                                                                        : 'grey.200',
                                                                                    color: nextLecture && nextLecture._id === lecture._id
                                                                                        ? 'white'
                                                                                        : 'grey.600'
                                                                                }}
                                                                            >
                                                                                {nextLecture && nextLecture._id === lecture._id ? (
                                                                                    <AccessTimeIcon fontSize="small" />
                                                                                ) : (
                                                                                    <ScheduleIcon fontSize="small" />
                                                                                )}
                                                                            </Box>
                                                                        </ListItemIcon>

                                                                        <ListItemText
                                                                            primary={
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                                                                        {lecture.subject}
                                                                                    </Typography>
                                                                                    {nextLecture && nextLecture._id === lecture._id && (
                                                                                        <Chip
                                                                                            label="Next"
                                                                                            size="small"
                                                                                            color="primary"
                                                                                            variant="filled"
                                                                                        />
                                                                                    )}
                                                                                </Box>
                                                                            }
                                                                            secondary={
                                                                                <Box sx={{ mt: 0.5 }}>
                                                                                    <Typography variant="body2" color="textSecondary">
                                                                                        <strong>Class:</strong> {lecture.class} •
                                                                                        <strong> Room:</strong> {lecture.room} •
                                                                                        <strong> Time:</strong> {lecture.time}
                                                                                    </Typography>
                                                                                    {lecture.notes && (
                                                                                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                                                                            <strong>Notes:</strong> {lecture.notes}
                                                                                        </Typography>
                                                                                    )}
                                                                                </Box>
                                                                            }
                                                                        />

                                                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                                                {lecture.timeStart}
                                                                            </Typography>
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                startIcon={<RoomIcon />}
                                                                                onClick={() => handleNavigation(`/teacher/class/${lecture.class?.replace(/\s+/g, '-').toLowerCase()}/attendance`)}
                                                                            >
                                                                                Take Attendance
                                                                            </Button>
                                                                        </Box>
                                                                    </ListItem>

                                                                    {index < todayLectures.lectures.length - 1 && (
                                                                        <Divider sx={{ my: 1 }} />
                                                                    )}
                                                                </React.Fragment>
                                                            ))}
                                                        </List>
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            {/* Quick Actions */}
                                            <Grid item xs={12}>
                                                <Card sx={{ bgcolor: '#f8f9fa' }}>
                                                    <CardContent>
                                                        <Typography variant="h6" gutterBottom>
                                                            Quick Actions
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                            <Button
                                                                variant="contained"
                                                                startIcon={<ScheduleIcon />}
                                                                onClick={() => handleNavigation(`/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/timetable`)}
                                                            >
                                                                View Full Timetable
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => handleNavigation(`/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/attendance`)}
                                                            >
                                                                Attendance Management
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                startIcon={<AssignmentIcon />}
                                                                onClick={() => handleNavigation(`/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/assignments`)}
                                                            >
                                                                Create Assignment
                                                            </Button>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>
                                    ) : (
                                        <Card>
                                            <CardContent sx={{ textAlign: 'center', py: 6 }}>
                                                <ScheduleIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                                                <Typography variant="h6" gutterBottom>
                                                    No Lectures Scheduled Today
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                                                    You don't have any lectures scheduled for {todayLectures.day}.
                                                </Typography>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<ScheduleIcon />}
                                                    onClick={() => handleNavigation(`/teacher/class/${className?.replace(/\s+/g, '-').toLowerCase()}/timetable`)}
                                                >
                                                    Manage Timetable
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            )}
                        </Box>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}

export default ClassHome;
