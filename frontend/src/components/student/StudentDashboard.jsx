import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import Navbar from '../common/Navbar';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Class as ClassIcon,
  Assignment as AssignmentIcon,
  Announcement as AnnouncementIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [openAssignmentDialog, setOpenAssignmentDialog] = useState(false);

  // Enhanced search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const navigate = useNavigate();

  // Memoize functions to prevent unnecessary re-renders
  const isAssignmentSubmitted = useCallback((assignment) => {
    return assignment.submissions?.some(sub => sub.student === user?._id);
  }, [user?._id]);

  const isAssignmentOverdue = useCallback((dueDate) => {
    return new Date() > new Date(dueDate);
  }, []);

  // Add back the missing functions
  const getAttendanceStats = useCallback(() => {
    const stats = { present: 0, absent: 0, late: 0 };
    attendance.forEach(record => {
      if (stats.hasOwnProperty(record.status)) {
        stats[record.status]++;
      }
    });
    return [
      { name: 'Present', value: stats.present, color: '#4caf50' },
      { name: 'Absent', value: stats.absent, color: '#f44336' },
      { name: 'Late', value: stats.late, color: '#ff9800' }
    ];
  }, [attendance]);

  const getAttendanceByDate = useCallback(() => {
    const dateMap = {};
    attendance.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      if (!dateMap[date]) {
        dateMap[date] = { present: 0, absent: 0, late: 0 };
      }
      if (dateMap[date].hasOwnProperty(record.status)) {
        dateMap[date][record.status]++;
      }
    });

    return Object.entries(dateMap).map(([date, stats]) => ({
      date,
      ...stats
    }));
  }, [attendance]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get classes first
      const classesRes = await axios.get('/student/classes');
      setClasses(classesRes.data || []);

      // Get announcements
      // const announcementsRes = await axios.post('/student/announcements');
      setAnnouncements();

      // Only fetch if we have classes
      if (classesRes.data && classesRes.data.length > 0) {
        // Get assignments and attendance for each class
        const assignmentsPromises = classesRes.data.map(cls =>
          axios.get(`/student/assignments/${cls._id}`).catch(err => ({ data: [] }))
        );
        const attendancePromises = classesRes.data.map(cls =>
          axios.get(`/student/attendance/${cls._id}`).catch(err => ({ data: [] }))
        );

        const [assignmentsResults, attendanceResults] = await Promise.all([
          Promise.all(assignmentsPromises),
          Promise.all(attendancePromises)
        ]);

        // Combine assignments from all classes
        const allAssignments = assignmentsResults.flatMap(res => res.data || []);
        setAssignments(allAssignments);

        // Combine attendance from all classes
        const allAttendance = attendanceResults.flatMap(res => res.data || []);
        setAttendance(allAttendance);
      }

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Cleanup function
    return () => {
      // Clean up any pending requests or timers
      if (selectedAssignment?.fileUrl) {
        window.URL.revokeObjectURL(selectedAssignment.fileUrl);
      }
    };
  }, [fetchData]);

  // Optimize filtering with better memoization
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // Early return if no data
    if (!classes.length && !assignments.length && !announcements.length) {
      return { classes: [], assignments: [], announcements: [], attendance: [] };
    }

    const filterBySearch = (items, searchFields) => {
      if (!query || !items.length) return items;
      return items.filter(item => {
        try {
          return searchFields.some(field => {
            const value = field.split('.').reduce((obj, key) => obj?.[key], item);
            if (Array.isArray(value)) {
              return value.some(v =>
                typeof v === 'object' ? v.name?.toLowerCase().includes(query) :
                  v?.toString().toLowerCase().includes(query)
              );
            }
            return value?.toString().toLowerCase().includes(query);
          });
        } catch (error) {
          console.warn('Filter error:', error);
          return false;
        }
      });
    };

    const filterByDate = (items, dateField) => {
      if (dateFilter === 'all' || !items.length) return items;
      const now = new Date();
      return items.filter(item => {
        try {
          const itemDate = new Date(item[dateField]);
          switch (dateFilter) {
            case 'today':
              return itemDate.toDateString() === now.toDateString();
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return itemDate >= weekAgo;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              return itemDate >= monthAgo;
            default:
              return true;
          }
        } catch (error) {
          console.warn('Date filter error:', error);
          return false;
        }
      });
    };

    // Apply filters with error handling
    let filteredClasses = classes;
    let filteredAssignments = assignments;
    let filteredAnnouncements = announcements;

    try {
      if (searchFilter === 'all' || searchFilter === 'classes') {
        filteredClasses = filterBySearch(classes, ['name', 'teacher.name', 'teachers', 'subjects']);
      }
      if (searchFilter === 'all' || searchFilter === 'assignments') {
        filteredAssignments = filterBySearch(assignments, ['title', 'description', 'class.name']);
      }
      if (searchFilter === 'all' || searchFilter === 'announcements') {
        filteredAnnouncements = filterBySearch(announcements, ['description', 'class.name', 'teacher.name']);
      }

      // Apply other filters
      if (assignmentFilter !== 'all') {
        filteredAssignments = filteredAssignments.filter(assignment => {
          const isSubmitted = isAssignmentSubmitted(assignment);
          const isOverdue = isAssignmentOverdue(assignment.dueDate);

          switch (assignmentFilter) {
            case 'pending': return !isSubmitted && !isOverdue;
            case 'submitted': return isSubmitted;
            case 'overdue': return !isSubmitted && isOverdue;
            default: return true;
          }
        });
      }

      if (classFilter !== 'all') {
        filteredAssignments = filteredAssignments.filter(assignment =>
          assignment.class?._id === classFilter
        );
        filteredAnnouncements = filteredAnnouncements.filter(announcement =>
          announcement.class?._id === classFilter
        );
      }

      // Apply date filters
      filteredAssignments = filterByDate(filteredAssignments, 'dueDate');
      filteredAnnouncements = filterByDate(filteredAnnouncements, 'createdAt');

    } catch (error) {
      console.error('Filtering error:', error);
    }

    return {
      classes: filteredClasses,
      assignments: filteredAssignments,
      announcements: filteredAnnouncements,
      attendance: attendance
    };
  }, [classes, assignments, announcements, attendance, searchQuery, searchFilter, assignmentFilter, classFilter, dateFilter, isAssignmentSubmitted, isAssignmentOverdue]);

  // Memoize expensive calculations
  const stats = useMemo(() => {
    const assignmentStats = { submitted: 0, pending: 0, overdue: 0 };

    assignments.forEach(assignment => {
      const isSubmitted = isAssignmentSubmitted(assignment);
      const isOverdue = isAssignmentOverdue(assignment.dueDate);

      if (isSubmitted) assignmentStats.submitted++;
      else if (isOverdue) assignmentStats.overdue++;
      else assignmentStats.pending++;
    });

    const attendanceRate = attendance.length > 0
      ? Math.round((attendance.filter(record => record.status === 'present').length / attendance.length) * 100)
      : 0;

    const upcomingDeadlines = assignments
      .filter(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const diffDays = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7 && !isAssignmentSubmitted(assignment);
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    return {
      assignmentStats,
      attendanceRate,
      upcomingDeadlines
    };
  }, [assignments, attendance, isAssignmentSubmitted, isAssignmentOverdue]);

  // Event handlers
  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, []);

  const handleViewAssignment = useCallback(async (assignment) => {
    try {
      const response = await axios.get(`/student/assignments/${assignment._id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setSelectedAssignment({ ...assignment, fileUrl: url });
      setOpenAssignmentDialog(true);
    } catch (err) {
      console.error('Failed to load assignment:', err);
      setError('Failed to load assignment file');
    }
  }, []);

  const handleCloseAssignmentDialog = useCallback(() => {
    setOpenAssignmentDialog(false);
    if (selectedAssignment?.fileUrl) {
      window.URL.revokeObjectURL(selectedAssignment.fileUrl);
    }
    setSelectedAssignment(null);
  }, [selectedAssignment]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSearchFilter('all');
    setAssignmentFilter('all');
    setClassFilter('all');
    setDateFilter('all');
  }, []);

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
        <Button variant="contained" onClick={fetchData}>
          Retry
        </Button>
      </Box>
    );
  }

  // Use stats from memoized calculations
  const { assignmentStats, attendanceRate, upcomingDeadlines } = stats;

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>

        {/* Quick Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {classes.length}
                    </Typography>
                    <Typography variant="body2">
                      Enrolled Classes
                    </Typography>
                  </Box>
                  <ClassIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {assignmentStats.pending}
                    </Typography>
                    <Typography variant="body2">
                      Pending Assignments
                    </Typography>
                  </Box>
                  <AssignmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {attendanceRate}%
                    </Typography>
                    <Typography variant="body2">
                      Attendance Rate
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {upcomingDeadlines.length}
                    </Typography>
                    <Typography variant="body2">
                      Due This Week
                    </Typography>
                  </Box>
                  <AccessTimeIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Upcoming Deadlines Alert */}
        {upcomingDeadlines.length > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<AccessTimeIcon />}
          >
            <Typography variant="subtitle2" gutterBottom>
              Upcoming Deadlines This Week:
            </Typography>
            {upcomingDeadlines.map((assignment) => (
              <Typography key={assignment._id} variant="body2">
                • {assignment.title} - Due {new Date(assignment.dueDate).toLocaleDateString()}
              </Typography>
            ))}
          </Alert>
        )}

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
                  My Classes
                  <Chip label={filteredData.classes.length} size="small" />
                </Box>
              }
            />
            {/* <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon />
                  Assignments
                  <Chip
                    label={filteredData.assignments.length}
                    size="small"
                    color={assignmentStats.overdue > 0 ? 'error' : 'default'}
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AnnouncementIcon />
                  Announcements
                  <Chip label={filteredData.announcements.length} size="small" />
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
            /> */}
          </Tabs>

          {/* Classes Tab */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              {filteredData.classes.length > 0 ? (
                <Grid container spacing={3}>
                  {filteredData.classes.map((cls) => (
                    <Grid item xs={12} sm={6} md={4} key={cls._id}>
                      <Card
                        sx={{
                          height: '100%',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4
                          }
                        }}
                        onClick={() => navigate(`/student/class/${cls.name.replace(/\s+/g, '-').toLowerCase()}`, {
                          state: {
                            classDetails: cls,
                            classId: cls._id,
                            className: cls.name,
                            teachers: cls.teachers || [cls.teacher],
                            subjects: cls.subjects || [],
                            schedule: {
                              startTime: cls.startTime,
                              endTime: cls.endTime
                            },
                            students: cls.students || [],
                            createdAt: cls.createdAt,
                            updatedAt: cls.updatedAt
                          }
                        })}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <ClassIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {cls.name}
                            </Typography>
                          </Box>

                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            <strong>Teacher{cls.teachers && cls.teachers.length > 1 ? 's' : ''}:</strong>{' '}
                            {cls.teachers && cls.teachers.length > 0
                              ? cls.teachers.map(teacher => teacher.name).join(', ')
                              : cls.teacher?.name || 'Not assigned'
                            }
                          </Typography>

                          {cls.schedule && (
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              <strong>Schedule:</strong> {cls.startTime} - {cls.endTime}
                            </Typography>
                          )}

                          {cls.subjects && cls.subjects.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" color="textSecondary" gutterBottom>
                                <strong>Subjects:</strong>
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {cls.subjects.slice(0, 3).map((subject, index) => (
                                  <Chip
                                    key={index}
                                    label={subject}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                                {cls.subjects.length > 3 && (
                                  <Chip
                                    label={`+${cls.subjects.length - 3} more`}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                  />
                                )}
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ClassIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    {searchQuery ? 'No classes match your search' : 'No classes enrolled'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}


          {/* Assignments Tab */}
          {/* {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              {filteredData.assignments.length > 0 ? (
                <Grid container spacing={3}>
                  {filteredData.assignments.map((assignment) => {
                    const borderColor = getBorderColor(assignment.dueDate);
                    const isSubmitted = isAssignmentSubmitted(assignment);
                    const isOverdue = isAssignmentOverdue(assignment.dueDate);

                    return (
                      <Grid item xs={12} sm={6} md={4} key={assignment._id}>
                        <Card
                          sx={{
                            height: '100%',
                            border: `2px solid ${borderColor}`,
                            position: 'relative',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: 4
                            }
                          }}
                        >
                          {isSubmitted && (
                            <Chip
                              label="Submitted"
                              color="success"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8
                              }}
                            />
                          )}
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {assignment.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              {assignment.description}
                            </Typography>
                          </CardContent>
                          <CardActions>
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => handleViewAssignment(assignment)}
                            >
                              View Assignment
                            </Button>
                            {!isSubmitted && !isOverdue && (
                              <Button
                                size="small"
                                onClick={() => navigate(`/student/submit-assignment/${assignment._id}`)}
                              >
                                Submit
                              </Button>
                            )}
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <AssignmentIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    No assignments found
                  </Typography>
                </Box>
              )}
            </Box>
          )} */}

          {/* Announcements Tab */}
          {/* {tabValue === 2 && (
            <Box sx={{ p: 3 }}>
              {filteredData.announcements.length > 0 ? (
                <Grid container spacing={3}>
                  {filteredData.announcements.map((announcement) => (
                    <Grid item xs={12} key={announcement._id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '10px' }} gutterBottom>
                            {announcement.class?.name}
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {announcement.description}
                          </Typography>
                          <Typography variant="body2" align="right" color="textSecondary">
                            Posted by: {announcement.teacher?.name} on {new Date(announcement.createdAt).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <AnnouncementIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    No announcements available
                  </Typography>
                </Box>
              )}
            </Box>
          )} */}

          {/* Analytics Tab */}
          {/* {tabValue === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Attendance Overview
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Attendance Distribution
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getAttendanceStats()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {getAttendanceStats().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Attendance by Date
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getAttendanceByDate()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="present" fill="#0088FE" name="Present" />
                          <Bar dataKey="absent" fill="#FF8042" name="Absent" />
                          <Bar dataKey="late" fill="#FFBB28" name="Late" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )} */}
        </Paper>
      </Container>

      {/* Assignment View Dialog */}
      {/* <Dialog
        open={openAssignmentDialog}
        onClose={handleCloseAssignmentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedAssignment?.title}
          <IconButton
            aria-label="close"
            onClick={handleCloseAssignmentDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedAssignment?.fileUrl && (
            <Box sx={{ mt: 2 }}>
              {selectedAssignment.file?.contentType?.includes('pdf') ? (
                <iframe
                  src={selectedAssignment.fileUrl}
                  style={{ width: '100%', height: '80vh', border: 'none' }}
                  title="Assignment Document"
                />
              ) : selectedAssignment.file?.contentType?.includes('image') ? (
                <img
                  src={selectedAssignment.fileUrl}
                  alt="Assignment"
                  style={{ maxWidth: '100%', maxHeight: '80vh' }}
                />
              ) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body1" gutterBottom>
                    This file type cannot be previewed directly.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => window.open(selectedAssignment.fileUrl, '_blank')}
                    sx={{ mt: 2 }}
                  >
                    Download File
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignmentDialog}>Close</Button>
        </DialogActions>
      </Dialog> */}
    </Box>
  );
};

// Add the missing getBorderColor function
const getBorderColor = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'red';
  if (diffDays === 0) return 'red';
  if (diffDays <= 2) return 'orange';
  if (diffDays <= 5) return 'yellow';
  return 'green';
};

export default StudentDashboard;
