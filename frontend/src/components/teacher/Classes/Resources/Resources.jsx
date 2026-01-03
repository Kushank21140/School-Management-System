import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
    List,
    ListItem,
    Divider,
    Checkbox,
    ListItemText,
    OutlinedInput
} from '@mui/material';
import {
    CloudUpload,
    Delete,
    Download,
    Description,
    Image,
    PictureAsPdf,
    Close,
    Add,
    ArrowBack
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../../common/Navbar';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

function Resources() {
    const location = useLocation();
    const navigate = useNavigate();

    // Get data passed from Class-home
    const className = location.state?.className;
    const passedClassData = location.state?.classData;
    const passedClassId = location.state?.classId;

    const [subjects, setSubjects] = useState([]);
    const [resources, setResources] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]); // Changed to array for multi-select
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
    const [currentClass, setCurrentClass] = useState(null);
    const [classId, setClassId] = useState(passedClassId);

    // Upload form state
    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        subject: '',
        file: null
    });

    // Initialize class data and subjects on component mount
    useEffect(() => {
        if (passedClassData && passedClassData[0]) {
            setCurrentClass(passedClassData[0]);
            setSubjects(passedClassData[0].subjects || []);
            setClassId(passedClassData[0]._id);
        } else if (!className) {
            // If no class data is passed, redirect back
            navigate('/teacher/classes');
            return;
        }

        if (classId) {
            fetchResources();
        }
    }, [passedClassData, className, classId, navigate]);

    // Fetch resources when selected subjects change
    useEffect(() => {
        if (classId) {
            if (selectedSubjects.length > 0) {
                fetchResourcesBySubjects(selectedSubjects);
            } else {
                fetchResources();
            }
        }
    }, [selectedSubjects, classId]);

    const fetchResources = async () => {
        if (!classId) return;

        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/teacher/classes/${classId}/resources`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setResources(data);
            } else {
                console.error('Failed to fetch resources:', response.status);
                showAlert('Failed to fetch resources', 'error');
            }
        } catch (error) {
            console.error('Fetch resources error:', error);
            showAlert('Failed to fetch resources', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchResourcesBySubjects = async (subjects) => {
        if (!classId) return;

        try {
            setLoading(true);
            // Create query string for multiple subjects
            const subjectQuery = subjects.map(subject => `subject=${encodeURIComponent(subject)}`).join('&');
            const response = await fetch(`http://localhost:5000/api/teacher/classes/${classId}/resources?${subjectQuery}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setResources(data);
            } else {
                console.error('Failed to fetch resources by subjects:', response.status);
                showAlert('Failed to fetch resources', 'error');
            }
        } catch (error) {
            console.error('Fetch resources by subjects error:', error);
            showAlert('Failed to fetch resources', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectFilterChange = (event) => {
        const {
            target: { value },
        } = event;
        setSelectedSubjects(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleFileUpload = async () => {
        if (!uploadForm.file || !uploadForm.title || !uploadForm.subject) {
            showAlert('Please fill all required fields', 'error');
            return;
        }

        if (!classId) {
            showAlert('Class ID not found', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', uploadForm.file);
        formData.append('title', uploadForm.title);
        formData.append('description', uploadForm.description);
        formData.append('subject', uploadForm.subject);
        formData.append('classId', classId);

        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/api/teacher/resources/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                showAlert('Resource uploaded successfully', 'success');
                setUploadDialogOpen(false);
                resetUploadForm();
                fetchResources();
            } else {
                const error = await response.json();
                console.error('Upload error:', error);
                showAlert(error.message || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('Upload failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteResource = async (resourceId) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/teacher/resources/${resourceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                showAlert('Resource deleted successfully', 'success');
                fetchResources();
            } else {
                showAlert('Failed to delete resource', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showAlert('Failed to delete resource', 'error');
        }
    };

    const handleDownloadResource = async (resourceId, filename) => {
        try {
            const response = await fetch(`http://localhost:5000/api/teacher/resources/${resourceId}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
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
            } else {
                showAlert('Failed to download resource', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            showAlert('Failed to download resource', 'error');
        }
    };

    const getFileIcon = (filename) => {
        const extension = filename.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf':
                return <PictureAsPdf color="error" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
                return <Image color="primary" />;
            default:
                return <Description color="action" />;
        }
    };

    const resetUploadForm = () => {
        setUploadForm({
            title: '',
            description: '',
            subject: '',
            file: null
        });
    };

    const showAlert = (message, severity) => {
        setAlert({ show: true, message, severity });
        setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
    };

    const handleBackToClass = () => {
        const classroutename = className.replace(/\s+/g, '-').toLowerCase();
        navigate(`/teacher/class/${classroutename}`, {
            state: {
                className,
                classData: passedClassData
            }
        });
    };

    // Helper function to get display text for selected subjects
    const getSelectedSubjectsDisplay = () => {
        if (selectedSubjects.length === 0) return 'All Subjects';
        if (selectedSubjects.length === 1) return selectedSubjects[0];
        return `${selectedSubjects.length} subjects selected`;
    };

    return (
        <Box sx={{ flexGrow: 1, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Navbar />
            <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
                {/* Alert */}
                {alert.show && (
                    <Alert
                        severity={alert.severity}
                        sx={{ mb: 3 }}
                        onClose={() => setAlert({ show: false, message: '', severity: 'info' })}
                    >
                        {alert.message}
                    </Alert>
                )}

                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <IconButton
                                onClick={handleBackToClass}
                                sx={{ mr: 1 }}
                            >
                                <ArrowBack />
                            </IconButton>
                            <Typography variant="h4" component="h1" fontWeight="bold">
                                Class Resources
                            </Typography>
                        </Box>
                        {currentClass && (
                            <Typography variant="h6" color="text.secondary" sx={{ ml: 6 }}>
                                {className}
                            </Typography>
                        )}
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setUploadDialogOpen(true)}
                        sx={{ borderRadius: 2 }}
                        disabled={!classId || subjects.length === 0}
                    >
                        Upload Resource
                    </Button>
                </Box>

                {/* Multi-Select Subject Filter */}
                {subjects.length > 0 && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <FormControl fullWidth>
                                <InputLabel id="subject-filter-label">Filter by Subjects</InputLabel>
                                <Select
                                    labelId="subject-filter-label"
                                    id="subject-filter"
                                    multiple
                                    value={selectedSubjects}
                                    onChange={handleSubjectFilterChange}
                                    input={<OutlinedInput label="Filter by Subjects" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.length === 0 ? (
                                                <Typography variant="body2" color="text.secondary">
                                                    All Subjects
                                                </Typography>
                                            ) : (
                                                selected.map((value) => (
                                                    <Chip key={value} label={value} size="small" />
                                                ))
                                            )}
                                        </Box>
                                    )}
                                    MenuProps={MenuProps}
                                >
                                    {subjects.map((subject) => (
                                        <MenuItem key={subject} value={subject}>
                                            <Checkbox checked={selectedSubjects.indexOf(subject) > -1} />
                                            <ListItemText primary={subject} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {selectedSubjects.length > 0 && (
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Showing resources for: {selectedSubjects.join(', ')}
                                    </Typography>
                                    <Button
                                        size="small"
                                        onClick={() => setSelectedSubjects([])}
                                        variant="outlined"
                                    >
                                        Clear Filter
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* No subjects warning */}
                {subjects.length === 0 && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        No subjects found for this class. Please add subjects to the class before uploading resources.
                    </Alert>
                )}

                {/* Resources List */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Resources {selectedSubjects.length > 0 && `(${getSelectedSubjectsDisplay()})`}
                        </Typography>

                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : resources.length === 0 ? (
                            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', p: 4 }}>
                                {subjects.length === 0
                                    ? 'Add subjects to this class to start uploading resources.'
                                    : selectedSubjects.length > 0
                                        ? `No resources found for selected subject${selectedSubjects.length > 1 ? 's' : ''}.`
                                        : 'No resources found. Upload your first resource to get started.'
                                }
                            </Typography>
                        ) : (
                            <List>
                                {resources.map((resource, index) => (
                                    <React.Fragment key={resource._id}>
                                        <ListItem>
                                            <Box sx={{ mr: 2 }}>
                                                {getFileIcon(resource.filename)}
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <Typography variant="subtitle1" component="h6">
                                                        {resource.title}
                                                    </Typography>
                                                    <Chip
                                                        label={resource.subject}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                                {resource.description && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                        {resource.description}
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" color="text.secondary">
                                                    Uploaded: {new Date(resource.uploadDate).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <IconButton
                                                    onClick={() => handleDownloadResource(resource._id, resource.filename)}
                                                    size="small"
                                                    title="Download"
                                                >
                                                    <Download />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleDeleteResource(resource._id)}
                                                    color="error"
                                                    size="small"
                                                    title="Delete"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Box>
                                        </ListItem>
                                        {index < resources.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </CardContent>
                </Card>

                {/* Upload Dialog */}
                <Dialog
                    open={uploadDialogOpen}
                    onClose={() => setUploadDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Upload Resource
                            <IconButton onClick={() => setUploadDialogOpen(false)}>
                                <Close />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Resource Title"
                                    value={uploadForm.title}
                                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth required>
                                    <InputLabel>Subject</InputLabel>
                                    <Select
                                        value={uploadForm.subject}
                                        label="Subject"
                                        onChange={(e) => setUploadForm({ ...uploadForm, subject: e.target.value })}
                                    >
                                        {subjects.map((subject, index) => (
                                            <MenuItem key={index} value={subject}>
                                                {subject}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    multiline
                                    rows={3}
                                    value={uploadForm.description}
                                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<CloudUpload />}
                                    fullWidth
                                    sx={{ p: 2 }}
                                >
                                    {uploadForm.file ? uploadForm.file.name : 'Choose File'}
                                    <input
                                        type="file"
                                        hidden
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                                    />
                                </Button>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)
                                </Typography>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={() => setUploadDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleFileUpload}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
                        >
                            {loading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}

export default Resources;
