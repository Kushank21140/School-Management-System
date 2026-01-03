const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, checkRole } = require('../middleware/auth');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Timetable = require('../models/TimeTable');
const path = require('path');
const fs = require('fs');

// Multer configuration for file upload
const upload = multer({
    limits: {
        fileSize: 5000000 // 5MB limit
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(pdf|jpg|jpeg|png|doc|docx)$/)) {
            return cb(new Error('Please upload a PDF, Word document, or image file'));
        }
        cb(undefined, true);
    }
});

// Get all classes for a student
router.get('/classes', auth, checkRole(['student']), async (req, res) => {
    try {
        const classes = await Class.find({ students: req.user._id })
            .populate('teachers', 'name email')
            .select('-students');
        res.json(classes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Get attendance for a specific class
router.get('/attendance/:classId', auth, async (req, res) => {
    try {
        const { classId } = req.params;
        const studentId = req.user.id;

        // Find all attendance records for this class
        const attendanceRecords = await Attendance.find({ 
            class: classId 
        }).sort({ date: -1 });

        // Extract student-specific attendance data
        const studentAttendance = [];
        
        attendanceRecords.forEach(attendance => {
            // Find this student's record in the attendance records array
            const studentRecord = attendance.records.find(
                record => record.student.toString() === studentId.toString()
            );
            
            if (studentRecord) {
                studentAttendance.push({
                    date: attendance.date,
                    status: studentRecord.status,
                    subject: attendance.subject || 'N/A', // Ensure subject is included
                    timeSlot: attendance.timeSlot || 'N/A', // Ensure timeSlot is included
                    markedAt: studentRecord.markedAt,
                    notes: studentRecord.notes
                });
            } else {
                // If no record found, student was likely absent
                studentAttendance.push({
                    date: attendance.date,
                    status: 'absent',
                    subject: attendance.subject || 'N/A',
                    timeSlot: attendance.timeSlot || 'N/A',
                    markedAt: null,
                    notes: null
                });
            }
        });
        
        res.json(studentAttendance);
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
});



// Get announcements
router.post('/announcements', auth, checkRole(['student']), async (req, res) => {
    try {

        const { classId } = req.body;

        const announcements = await Announcement.find({ classId: classId, status: 'active' })
            .populate('teacherId', 'name')
            .sort({ createdAt: -1 });

        const formatted = announcements.map(a => ({
            id: a._id,
            title: a.title,
            content: a.content,
            priority: a.priority,
            status: a.status,
            classId: a.classId,
            teacherId: a.teacherId?._id || null,
            teacherName: a.teacherId?.name || 'Unknown',
            expiryDate: a.expiryDate,
            createdAt: a.createdAt,
            attachments: a.attachments
        }));


        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//Download Announcement file
router.post('/announcements/:id/download', auth, checkRole(['student']), async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement || !announcement.attachments || announcement.attachments.length === 0) {
            return res.status(404).json({ message: 'No attachments found' });
        }

        const file = announcement.attachments[0]; // or allow selecting by index or ID

        const filePath = path.join(__dirname, '..', 'uploads', 'announcements', file.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Download failed', error: error.message });
    }
});

// Get Resources
router.post('/getResources', auth, checkRole(['student']), async (req, res) => {
    try {

        const { classId } = req.body;
        
        const resources = await Resource.find({ classId: classId })
        .populate('teacher', 'name')
        .sort({ createdAt: -1 });

        const formatted = resources.map(a => ({
            id: a._id,
            title: a.title,
            description: a.description,
            uploadDate: a.uploadDate,
            filename: a.filename,
            filesize: a.filesize,
            subject: a.subject,
            teacherName: a.teacher?.name || 'Unknown',
        }));

        res.json(formatted);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//Download Resources
router.get('/resources/:id/download', auth, async (req, res) => {
    try {
        const resource = await Resource.findOne({
            _id: req.params.id,
        });

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        if (!fs.existsSync(resource.filepath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${resource.filename}"`);
        res.setHeader('Content-Type', resource.mimetype);

        const fileStream = fs.createReadStream(resource.filepath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Download failed', error: error.message });
    }
});

//Get assignments
router.post('/assignments', auth, checkRole(['student']), async (req, res) => {
    try {
        const { classId } = req.body;

        // Check if student is enrolled in the class
        const classExists = await Class.findOne({
            _id: classId,
            students: req.user._id
        });

        if (!classExists) {
            return res.status(404).json({ error: 'Class not found or you are not enrolled' });
        }

        // Get all assignments for the class
        const assignments = await Assignment.find({ class: classId })
            .select('-file.data')
            .populate('teacher', 'name')
            .sort({ dueDate: 1 });

        // Get all submissions by the student for these assignments
        const submissions = await Submission.find({
            student: req.user._id,
            assignment: { $in: assignments.map(a => a._id) }
        });

        // Create a map: assignmentId -> submission
        const submissionMap = {};
        submissions.forEach(sub => {
            submissionMap[String(sub.assignment)] = sub;
        });

        // Format assignments with submission details if available
        const formatted = assignments.map(a => {
            const submission = submissionMap[String(a._id)];

            const baseData = {
                id: a._id,
                title: a.title,
                instructions: a.instructions,
                totalmarks: a.totalMarks,
                description: a.description,
                attachments: a.attachments,
                uploadDate: a.createdAt,
                dueDate: a.dueDate,
                teacherId: a.teacher?._id || null,
                teacherName: a.teacher?.name || 'Unknown',
                status: submission ? 'submitted' : 'pending',
                
            };

            if (submission) {
                baseData.submissionDetails = {
                    isGraded: submission.isGraded || false,
                    feedback: submission.feedback || '',
                    comments: submission.comments || '',
                    submittedFiles: submission.files || [],
                    submittedAt: submission.submittedAt
                };
            }

            return baseData;
        });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Download assignment file
router.get('/assignments/:assignmentId/download', auth, checkRole(['student']), async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const assignment = await Assignment.findById(assignmentId)
            .populate('class', 'students');

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Check if student is enrolled in the class
        if (!assignment.class.students.includes(req.user._id)) {
            return res.status(403).json({ error: 'You are not authorized to download this assignment' });
        }

        if (!assignment.file) {
            return res.status(404).json({ error: 'No file attached to this assignment' });
        }

        res.set('Content-Type', assignment.file.contentType);
        res.set('Content-Disposition', `attachment; filename="${assignment.file.filename}"`);
        res.send(assignment.file.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const submissionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/submission/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const assignmentUpload = multer({
    storage: submissionStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|ppt|pptx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only specific file types are allowed!'));
        }
    }
});


// Submit assignment
router.post(
    '/submit-assignment',
    auth,
    checkRole(['student']),
    assignmentUpload.single('file'), // Only one file, change to .array('files', 5) for multiple
    async (req, res) => {
        try {
            const { ass_id } = req.body;

            const assignment = await Assignment.findById(ass_id).populate('class', 'students');

            if (!assignment) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            const existingSubmission = await Submission.findOne({
                assignment: ass_id,
                student: req.user._id,
            });

            if (existingSubmission) {
                return res.status(400).json({ error: 'You have already submitted this assignment' });
            }

            if (new Date() > new Date(assignment.dueDate)) {
                return res.status(400).json({ error: 'Assignment due date has passed' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Please upload a file' });
            }

            const attachment = {
                name: req.file.originalname,
                url: `/uploads/submission/${req.file.filename}`,
                size: req.file.size,
            };

            const submission = new Submission({
                assignment: ass_id,
                student: req.user._id,
                files: [attachment],
            });

            await submission.save();

            res.status(201).json(submission);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Add this route to the existing student.js file

// Get timetable for a specific class
router.post('/timetable', auth, checkRole(['student']), async (req, res) => {
    try {
        const { classId } = req.body;

        // Check if student is enrolled in the class
        const classExists = await Class.findOne({
            _id: classId,
            students: req.user._id
        });

        if (!classExists) {
            return res.status(404).json({ error: 'Class not found or you are not enrolled' });
        }

        const timetableEntries = await Timetable.find({
            class: classId,
            isActive: true
        })
        .populate('teacher', 'name')
        .populate('class', 'name')
        .sort({ day: 1, time: 1 });

        // Transform data for frontend
        const formattedTimetable = timetableEntries.map(entry => ({
            id: entry._id,
            subject: entry.subject,
            teacher: entry.teacher.name,
            room: entry.room,
            day: entry.day,
            time: entry.time,
            color: entry.color,
            notes: entry.notes,
            class: entry.class.name
        }));

        res.json(formattedTimetable);
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
});




module.exports = router; 