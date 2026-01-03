import React, { useState, useEffect } from 'react';
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
  MenuItem
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
  Announcement as AnnouncementIcon
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
import axios from '../../utils/axios';
import Navbar from '../common/Navbar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    totalClasses: 0
  });

  // Classes state - Initialize as empty array
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [classSortConfig, setClassSortConfig] = useState({
    key: 'name',
    direction: 'asc'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  // Classes filtering and sorting - Add safety checks
  useEffect(() => {
    // Ensure classes is always an array
    const classesArray = Array.isArray(classes) ? classes : [];
    let filtered = classesArray;

    if (classSearchTerm.trim()) {
      filtered = classesArray.filter((classItem) =>
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors

      const classesRes = await axios.get('http://localhost:5000/api/common/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Ensure the response data is an array
      const classesData = Array.isArray(classesRes.data.data) ? classesRes.data.data : [];
      setClasses(classesData);

      setStats({
        totalClasses: classesData.length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.error || 'Failed to fetch data');
      // Set empty array on error to prevent iteration issues
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Class handlers
  const handleClassSearchChange = (event) => {
    setClassSearchTerm(event.target.value);
  };

  const handleClearClassSearch = () => {
    setClassSearchTerm('');
  };

  const handleClassClick = (className) => {
    const cname = className.replace(/\s+/g, '-').toLowerCase();
    navigate(`/teacher/class/${cname}`, {
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
          Teacher Dashboard
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

        {/* My Classes Section */}
        <Paper sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ClassIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                My Classes
              </Typography>
              <Chip label={filteredClasses.length} size="small" color="primary" />
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Class Search and Filter Section */}
            <Paper sx={{
              mb: 3,
              p: 3,
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={9}>
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
                  {classes.length === 0 ? 'No classes assigned' : 'No classes match your search'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {classes.length === 0
                    ? 'You have no classes assigned to you yet'
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
                                Students: {classItem.studentCount || classItem.students?.length || 0}
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

            {/* Class Statistics */}
            {filteredClasses.length > 0 && (
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
                  Total: {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: '#2196f3'
                    }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      Active Classes ({filteredClasses.length})
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default TeacherDashboard;
