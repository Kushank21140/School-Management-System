import React, { useState, useEffect } from 'react';
import Navbar from '../common/Navbar';
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
  CardActionArea,
  Button,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Search, 
  Clear, 
  Add, 
  Person, 
  School, 
  CalendarToday,
  Class as ClassIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0
  });
  
  // Classes state
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [classSortConfig, setClassSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });
  
  // Users state
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSortConfig, setUserSortConfig] = useState({
    key: 'role',
    direction: 'asc'
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceData, setAttendanceData] = useState({
    labels: [],
    datasets: []
  });

  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchAttendanceData();
    fetchClasses();
    fetchUsers();
  }, []);

  // Classes filtering and sorting
  useEffect(() => {
    let filtered = classes;

    if (classSearchTerm.trim()) {
      filtered = classes.filter((classItem) =>
        classItem.name?.toLowerCase().includes(classSearchTerm.toLowerCase())
      );
    }

    if (classSortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[classSortConfig.key];
        let bValue = b[classSortConfig.key];

        if (classSortConfig.key === 'createdAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return classSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return classSortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredClasses(filtered);
  }, [classSearchTerm, classes, classSortConfig]);

  // Users filtering and sorting
  useEffect(() => {
    let filtered = users;

    if (userSearchTerm.trim()) {
      filtered = users.filter((user) =>
        user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
    }

    if (userSortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[userSortConfig.key];
        let bValue = b[userSortConfig.key];

        if (userSortConfig.key === 'createdAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (userSortConfig.key === 'role') {
          aValue = getRolePriority(aValue);
          bValue = getRolePriority(bValue);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return userSortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return userSortConfig.direction === 'asc' ? 1 : -1;
        }

        if (userSortConfig.key === 'role') {
          const nameA = a.name?.toLowerCase() || '';
          const nameB = b.name?.toLowerCase() || '';
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
        }

        return 0;
      });
    }

    setFilteredUsers(filtered);
  }, [userSearchTerm, users, userSortConfig]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceData({
        labels: response.data.labels,
        datasets: [{
          label: 'Attendance',
          data: response.data.data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        }]
      });
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/common/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Classes:', error);
      setError(error.response?.data?.error || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/get-users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.error || 'Failed to fetch users');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Class handlers
  const handleClassSearchChange = (event) => {
    setClassSearchTerm(event.target.value);
  };

  const handleClearClassSearch = () => {
    setClassSearchTerm('');
  };

  const handleCreateClass = () => {
    navigate('/admin/create-class');
  };

  const handleClassClick = (className) => {
    const cname = className.replace(/\s+/g, '-').toLowerCase();
    navigate(`/admin/class/${cname}`, {
      state: {
        className: className,
      }
    });
  };

  const handleClassSortChange = (event) => {
    const [key, direction] = event.target.value.split('-');
    setClassSortConfig({ key, direction });
  };

  const getClassSortValue = () => {
    return `${classSortConfig.key}-${classSortConfig.direction}`;
  };

  // User handlers
  const handleUserSearchChange = (event) => {
    setUserSearchTerm(event.target.value);
  };

  const handleClearUserSearch = () => {
    setUserSearchTerm('');
  };

  const handleAddUser = () => {
    navigate('/admin/add-user');
  };

  const handleUserSort = (key) => {
    let direction = 'asc';
    if (userSortConfig.key === key && userSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setUserSortConfig({ key, direction });
  };

  // Utility functions
  const getRolePriority = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 1;
      case 'teacher':
        return 2;
      case 'student':
        return 3;
      default:
        return 4;
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'error';
      case 'teacher':
        return 'primary';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  };

  const getAvatarColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return '#f44336';
      case 'teacher':
        return '#2196f3';
      case 'student':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserCounts = () => {
    const counts = {
      admin: 0,
      teacher: 0,
      student: 0,
      total: filteredUsers.length
    };

    filteredUsers.forEach(user => {
      const role = user.role?.toLowerCase();
      if (role === 'admin') counts.admin++;
      else if (role === 'teacher') counts.teacher++;
      else if (role === 'student') counts.student++;
    });

    return counts;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2', mb: 4 }}>
          School Management Dashboard
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

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <ClassIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.totalClasses || classes.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Classes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.totalTeachers || users.filter(u => u.role === 'teacher').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Teachers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stats.totalStudents || users.filter(u => u.role === 'student').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Students
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Attendance Chart */}
        {attendanceData.labels.length > 0 && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Attendance Overview
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={attendanceData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: 'Daily Attendance Statistics'
                  }
                }
              }} />
            </Box>
          </Paper>
        )}

        {/* Main Content Tabs */}
        <Paper sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ClassIcon />
                  Classes
                  <Chip label={filteredClasses.length} size="small" />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon />
                  Users
                  <Chip label={filteredUsers.length} size="small" />
                </Box>
              }
            />
          </Tabs>

          {/* Classes Tab */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              {/* Class Search and Filter Section */}
              <Paper sx={{
                mb: 3,
                p: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Search classes by name..."
                      value={classSearchTerm}
                      onChange={handleClassSearchChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: classSearchTerm && (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="clear search"
                              onClick={handleClearClassSearch}
                              edge="end"
                              size="small"
                            >
                              <Clear />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={getClassSortValue()}
                        onChange={handleClassSortChange}
                        label="Sort By"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="name-asc">Name (A-Z)</MenuItem>
                        <MenuItem value="name-desc">Name (Z-A)</MenuItem>
                        <MenuItem value="createdAt-desc">Newest First</MenuItem>
                        <MenuItem value="createdAt-asc">Oldest First</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<Add />}
                      onClick={handleCreateClass}
                      sx={{
                        height: '56px',
                        borderRadius: 2,
                        fontWeight: 600
                      }}
                    >
                      Create Class
                    </Button>
                  </Grid>
                </Grid>

                {(classSearchTerm || classes.length > 0) && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      {classSearchTerm ? (
                        filteredClasses.length === 0 ? (
                          `No results found for "${classSearchTerm}"`
                        ) : (
                          `Showing ${filteredClasses.length} of ${classes.length} classes`
                        )
                      ) : (
                        `Total: ${classes.length} class${classes.length !== 1 ? 'es' : ''}`
                      )}
                    </Typography>

                    {classSearchTerm && (
                      <Chip
                        label={`Search: "${classSearchTerm}"`}
                        onDelete={handleClearClassSearch}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                )}
              </Paper>

              {/* Classes Grid */}
              {filteredClasses.length === 0 ? (
                <Paper sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <School sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    {classes.length === 0 ? 'No classes found' : 'No classes match your search'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {classes.length === 0
                      ? 'Get started by creating your first class'
                      : 'Try adjusting your search criteria'
                    }
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {filteredClasses.map((classItem) => (
                    <Grid item xs={12} sm={6} md={4} key={classItem._id}>
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
                        <CardActionArea
                          onClick={() => handleClassClick(classItem.name)}
                          sx={{ height: '100%' }}
                        >
                          <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: 'primary.main',
                                  mr: 2,
                                  width: 48,
                                  height: 48
                                }}
                              >
                                <School />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="h6"
                                  component="h2"
                                  sx={{
                                    fontWeight: 'bold',
                                    color: 'primary.main',
                                    mb: 0.5
                                  }}
                                >
                                  {classItem.name}
                                </Typography>
                                <Chip
                                  label="Active"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              </Box>
                            </Box>

                            <Box sx={{ mt: 'auto' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                                <Typography variant="body2" color="textSecondary">
                                  Created: {new Date(classItem.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Person sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                                <Typography variant="body2" color="textSecondary">
                                  Students: {classItem.studentCount || 0}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {/* Users Tab */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              {/* User Search Section */}
              <Box sx={{
                mb: 3,
                p: 3,
                backgroundColor: 'white',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap'
              }}>
                <TextField
                  placeholder="Search users by name, email, or role..."
                  value={userSearchTerm}
                  onChange={handleUserSearchChange}
                  variant="outlined"
                  sx={{
                    flexGrow: 1,
                    minWidth: '300px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#f8f9fa',
                      '&:hover': {
                        backgroundColor: '#f0f2f5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                        boxShadow: '0 0 0 2px rgba(33, 150, 243, 0.2)',
                      }
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#666' }} />
                      </InputAdornment>
                    ),
                    endAdornment: userSearchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleClearUserSearch}
                          edge="end"
                          size="small"
                          sx={{
                            color: '#666',
                            '&:hover': {
                              backgroundColor: 'rgba(0,0,0,0.04)'
                            }
                          }}
                        >
                          <Clear />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={handleAddUser}
                  sx={{
                    height: '56px',
                    minWidth: '140px',
                    whiteSpace: 'nowrap',
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1976D2 30%, #1E88E5 90%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 10px 2px rgba(33, 203, 243, .3)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Add User
                </Button>
              </Box>

              {userSearchTerm && (
                <Box sx={{ mb: 2, px: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    {filteredUsers.length === 0
                      ? `No results found for "${userSearchTerm}"`
                      : `Showing ${filteredUsers.length} of ${users.length} user${filteredUsers.length !== 1 ? 's' : ''}`
                    }
                  </Typography>
                </Box>
              )}

              {/* Users Table */}
              <TableContainer
                component={Paper}
                sx={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '& .MuiTableCell-head': {
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        borderBottom: 'none'
                      }
                    }}>
                      <TableCell align="center">
                        <TableSortLabel
                          active={userSortConfig.key === 'name'}
                          direction={userSortConfig.key === 'name' ? userSortConfig.direction : 'asc'}
                          onClick={() => handleUserSort('name')}
                          sx={{
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': {
                              color: 'white !important'
                            },
                            justifyContent: 'center',
                            flexDirection: 'row'
                          }}
                        >
                          Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={userSortConfig.key === 'email'}
                          direction={userSortConfig.key === 'email' ? userSortConfig.direction : 'asc'}
                          onClick={() => handleUserSort('email')}
                          sx={{
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': {
                              color: 'white !important'
                            },
                            justifyContent: 'center',
                            flexDirection: 'row'
                          }}
                        >
                          Email
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={userSortConfig.key === 'role'}
                          direction={userSortConfig.key === 'role' ? userSortConfig.direction : 'asc'}
                          onClick={() => handleUserSort('role')}
                          sx={{
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': {
                              color: 'white !important'
                            },
                            justifyContent: 'center',
                            flexDirection: 'row'
                          }}
                        >
                          Role
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={userSortConfig.key === 'createdAt'}
                          direction={userSortConfig.key === 'createdAt' ? userSortConfig.direction : 'asc'}
                          onClick={() => handleUserSort('createdAt')}
                          sx={{
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': {
                              color: 'white !important'
                            },
                            justifyContent: 'center',
                            flexDirection: 'row'
                          }}
                        >
                          Created Date
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Person sx={{ fontSize: 60, color: 'text.secondary' }} />
                            <Typography variant="h6" color="textSecondary">
                              {userSearchTerm ? `No users found matching "${userSearchTerm}"` : 'No users found'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow
                          key={user._id}
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: '#f8f9ff'
                            },
                            '&:hover': {
                              backgroundColor: '#e3f2fd',
                              transform: 'scale(1.001)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              cursor: 'pointer'
                            },
                            transition: 'all 0.2s ease',
                            '& .MuiTableCell-root': {
                              borderBottom: '1px solid #e8eaf6',
                              py: 2
                            }
                          }}
                        >
                          <TableCell align="left">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: getAvatarColor(user.role),
                                  width: 40,
                                  height: 40,
                                  fontSize: '0.9rem',
                                  fontWeight: 'bold',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}
                              >
                                {getInitials(user.name)}
                              </Avatar>
                              <Box sx={{ flex: 1, textAlign: 'center' }}>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: 600,
                                    color: '#2c3e50'
                                  }}
                                >
                                  {user.name || 'Unknown User'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#546e7a',
                                fontFamily: 'monospace',
                                backgroundColor: '#f5f5f5',
                                padding: '4px 8px',
                                borderRadius: 1,
                                display: 'inline-block'
                              }}
                            >
                              {user.email || 'No email'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
                              color={getRoleColor(user.role)}
                              size="medium"
                              sx={{
                                fontWeight: 'bold',
                                minWidth: '90px',
                                fontSize: '0.8rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                '&.MuiChip-colorError': {
                                  background: 'linear-gradient(45deg, #f44336 30%, #e57373 90%)',
                                  color: 'white'
                                },
                                '&.MuiChip-colorPrimary': {
                                  background: 'linear-gradient(45deg, #2196f3 30%, #64b5f6 90%)',
                                  color: 'white'
                                },
                                '&.MuiChip-colorSuccess': {
                                  background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
                                  color: 'white'
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  color: '#2c3e50'
                                }}
                              >
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'Unknown'}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#7b8794',
                                  fontSize: '0.7rem'
                                }}
                              >
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                  weekday: 'short'
                                }) : ''}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* User Statistics */}
              {filteredUsers.length > 0 && (
                <Box sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2
                }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#2c3e50' }}>
                    Total: {getUserCounts().total} user{getUserCounts().total !== 1 ? 's' : ''}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#f44336'
                      }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Admin ({getUserCounts().admin})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#2196f3'
                      }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Teacher ({getUserCounts().teacher})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: '#4caf50'
                      }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Student ({getUserCounts().student})
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
