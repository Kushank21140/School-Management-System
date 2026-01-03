import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    IconButton,
    Container,
    Button,
    TableSortLabel,
    Chip,
    Avatar
} from '@mui/material';
import { Search, Clear, Add, Person, ArrowBack } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../../common/Navbar';

const TeacherList = () => {
    const [users, setusers] = useState([]);
    const [filteredusers, setFilteredusers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({
        key: 'name',
        direction: 'asc'
    });

    const { token } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const location = useLocation();

    // Get class name from location state
    const className = location.state?.className;
    const classData = location.state?.classData;

    // Function to get user counts by role
    const getUserCounts = () => {
        const counts = {
            teacher: 0,
            total: filteredusers.length
        };

        filteredusers.forEach(user => {
            const role = user.role?.toLowerCase();
            if (role === 'teacher') counts.teacher++;
        });

        return counts;
    };

    useEffect(() => {
        fetchUsers();
    }, [className]);

    useEffect(() => {
        let filtered = users;

        if (searchTerm.trim()) {
            filtered = users.filter((user) =>
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.role?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredusers(filtered);
    }, [searchTerm, users, sortConfig]);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            // Construct API URL based on whether we have a class name
            let apiUrl = 'http://localhost:5000/api/teacher/get-teachers-list';
            if (className) {
                // Encode the class name for URL
                apiUrl += `/${encodeURIComponent(className)}`;
            }

            const response = await axios.get(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setusers(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError(error.response?.data?.error || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleBackNavigation = () => {
        if (className) {
            // If we came from a specific class, go back to that class home
            const classroutename = className.replace(/\s+/g, '-').toLowerCase();
            navigate(`/teacher/class/${classroutename}`, {
                state: {
                    className,
                    classData
                }
            });
        } else {
            // If no specific class, go back to general classes page
            navigate('/teacher/classes');
        }
    };

    const getRoleColor = (role) => {
        return 'primary';
    };

    const getAvatarColor = (role) => {
        return '#2196f3';
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

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    const userCounts = getUserCounts();

    return (
        <Box sx={{ flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Navbar />
            <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
                {/* Header with back button and class info */}
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={handleBackNavigation}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                    >
                        Back
                    </Button>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                        {className ? `Teachers - ${className}` : 'All Teachers'}
                    </Typography>
                </Box>

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
                    {/* Search Input */}
                    <TextField
                        placeholder="Search teachers by name, email, or role..."
                        value={searchTerm}
                        onChange={handleSearchChange}
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
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={handleClearSearch}
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
                </Box>

                {searchTerm && (
                    <Box sx={{ mb: 2, px: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                            {filteredusers.length === 0
                                ? `No results found for "${searchTerm}"`
                                : `Showing ${filteredusers.length} of ${users.length} teacher${filteredusers.length !== 1 ? 's' : ''}`
                            }
                        </Typography>
                    </Box>
                )}

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
                                        active={sortConfig.key === 'name'}
                                        direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                                        onClick={() => handleSort('name')}
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
                                        active={sortConfig.key === 'email'}
                                        direction={sortConfig.key === 'email' ? sortConfig.direction : 'asc'}
                                        onClick={() => handleSort('email')}
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
                                        active={sortConfig.key === 'role'}
                                        direction={sortConfig.key === 'role' ? sortConfig.direction : 'asc'}
                                        onClick={() => handleSort('role')}
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
                                        active={sortConfig.key === 'createdAt'}
                                        direction={sortConfig.key === 'createdAt' ? sortConfig.direction : 'asc'}
                                        onClick={() => handleSort('createdAt')}
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
                            {filteredusers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <Person sx={{ fontSize: 60, color: 'text.secondary' }} />
                                            <Typography variant="h6" color="textSecondary">
                                                {searchTerm
                                                    ? `No teachers found matching "${searchTerm}"`
                                                    : className
                                                        ? `No teachers assigned to ${className}`
                                                        : 'No teachers found'
                                                }
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredusers.map((user) => (
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

                {filteredusers.length > 0 && (
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
                            Total: {userCounts.total} Teacher{userCounts.total !== 1 ? 's' : ''}
                           
                        </Typography>
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default TeacherList;
