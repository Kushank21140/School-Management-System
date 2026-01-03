const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, checkRole } = require('../middleware/auth');
const User = require('../models/User');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const Resource = require('../models/Resource');
const Timetable = require('../models/TimeTable');
const Assessment = require('../models/Assessment');
const Grade = require('../models/Grade');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Get all classes for a teacher
router.get('/classes', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const classes = await Class.find({
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    })
      .populate({
        path: 'students',
        select: 'name email parentName parentEmail parentMobile'
      })
      .populate('teacher', 'name email')
      .populate('teachers', 'name email');
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get class statistics
// Get class statistics
router.get('/class/:className/stats', auth, checkRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { className } = req.params;

    // Find the class
    const classData = await Class.findOne({ name: className });
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    // Get total students and teachers from the class data
    const totalStudents = classData.students ? classData.students.length : 0;
    const totalTeachers = classData.teachers ? classData.teachers.length : 0;

    // Get total assignments
    const totalAssignments = await Assignment.countDocuments({
      class: classData._id
    });

    // Get today's attendance percentage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate today's attendance
    let attendanceToday = 0;
    
    if (totalStudents > 0) {
      // Get today's attendance records for this class
      const todayAttendanceRecords = await Attendance.find({
        class: classData._id,
        date: {
          $gte: today,
          $lt: tomorrow
        },
        isCompleted: true // Only count completed attendance sessions
      });

      if (todayAttendanceRecords.length > 0) {
        // Calculate average attendance percentage for today
        const totalAttendancePercentage = todayAttendanceRecords.reduce((sum, record) => {
          return sum + (record.attendancePercentage || 0);
        }, 0);
        
        attendanceToday = Math.round(totalAttendancePercentage / todayAttendanceRecords.length);
      } else {
        // If no attendance records for today, check if there are any lectures scheduled
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[today.getDay()];
        
        const todayLectures = await Timetable.countDocuments({
          class: classData._id,
          day: currentDay,
          isActive: true
        });
        
        // If there are lectures scheduled but no attendance taken, set to 0
        // If no lectures scheduled, set to null or 100 (depending on your preference)
        attendanceToday = todayLectures > 0 ? 0 : null;
      }
    }

    // Get additional statistics
    const totalExams = await Assessment.countDocuments({
      class: classData._id
    });

    // Get this week's attendance average
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of current week
    weekStart.setHours(0, 0, 0, 0);

    const weekAttendanceRecords = await Attendance.find({
      class: classData._id,
      date: {
        $gte: weekStart,
        $lt: tomorrow
      },
      isCompleted: true
    });

    let weeklyAttendance = 0;
    if (weekAttendanceRecords.length > 0) {
      const weeklyTotal = weekAttendanceRecords.reduce((sum, record) => {
        return sum + (record.attendancePercentage || 0);
      }, 0);
      weeklyAttendance = Math.round(weeklyTotal / weekAttendanceRecords.length);
    }

    // Get monthly attendance average
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthAttendanceRecords = await Attendance.find({
      class: classData._id,
      date: {
        $gte: monthStart,
        $lt: tomorrow
      },
      isCompleted: true
    });

    let monthlyAttendance = 0;
    if (monthAttendanceRecords.length > 0) {
      const monthlyTotal = monthAttendanceRecords.reduce((sum, record) => {
        return sum + (record.attendancePercentage || 0);
      }, 0);
      monthlyAttendance = Math.round(monthlyTotal / monthAttendanceRecords.length);
    }

    const stats = {
      totalStudents,
      totalTeachers,
      totalAssignments,
      totalExams,
      attendanceToday: attendanceToday !== null ? attendanceToday : 0,
      weeklyAttendance,
      monthlyAttendance,
      // Additional useful stats
      activeAssignments: await Assignment.countDocuments({
        class: classData._id,
        dueDate: { $gte: today }
      }),
      completedAttendanceSessions: await Attendance.countDocuments({
        class: classData._id,
        isCompleted: true
      }),
      totalAttendanceSessions: await Attendance.countDocuments({
        class: classData._id
      })
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching class stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class statistics'
    });
  }
});


// Get class details by name
router.get('/class/:name', auth, checkRole('teacher'), async (req, res) => {
  try {
    const classdetails = await Class.find({ name: req.params.name })
      .populate('teachers', 'name email role')
      .populate('students', 'name email parentName parentEmail parentMobile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: classdetails
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching classes'
    });
  }
});

// Get teachers list - optionally filtered by class name
router.get('/get-teachers-list/:className?', auth, checkRole('teacher'), async (req, res) => {
  try {
    const { className } = req.params;

    let query = { teachers: { $exists: true, $ne: [] } };

    if (className) {
      query.name = decodeURIComponent(className);
    }

    const classesWithTeachers = await Class.find(query).populate('teachers', '-password');

    if (classesWithTeachers.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: className ? `No teachers found for class ${className}` : 'No teachers assigned to any classes'
      });
    }

    const teachersMap = new Map();

    classesWithTeachers.forEach(classData => {
      if (classData.teachers && classData.teachers.length > 0) {
        classData.teachers.forEach(teacher => {
          if (teacher && teacher.role === 'teacher') {
            teachersMap.set(teacher._id.toString(), teacher);
          }
        });
      }
    });

    const teachers = Array.from(teachersMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: teachers,
      count: teachers.length,
      className: className || null
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching teachers'
    });
  }
});

// Get students list - optionally filtered by class name
router.get('/get-students-list/:className?', auth, checkRole('teacher'), async (req, res) => {
  try {
    const { className } = req.params;

    let query = { students: { $exists: true, $ne: [] } };

    if (className) {
      query.name = decodeURIComponent(className);
    }

    const classesWithStudents = await Class.find(query).populate('students', '-password');

    if (classesWithStudents.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: className ? `No students found for class ${className}` : 'No students assigned to any classes'
      });
    }

    const studentsMap = new Map();

    classesWithStudents.forEach(classData => {
      if (classData.students && classData.students.length > 0) {
        classData.students.forEach(student => {
          if (student && student.role === 'student') {
            studentsMap.set(student._id.toString(), student);
          }
        });
      }
    });

    const students = Array.from(studentsMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: students,
      count: students.length,
      className: className || null
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching students'
    });
  }
});


// ==================== FILE UPLOAD CONFIGURATION ====================

// Configure multer for resource uploads
const resourceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/resources/';
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

const resourceUpload = multer({
  storage: resourceStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(pdf|jpg|jpeg|png|doc|docx|txt|ppt|pptx)$/)) {
      return cb(new Error('Please upload a valid file type (PDF, Word, Image, PowerPoint, Text)'));
    }
    cb(undefined, true);
  }
});

// Configure multer for assignment file uploads
const assignmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/assignments/';
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
  storage: assignmentStorage,
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

// ==================== CLASS MANAGEMENT ROUTES ====================

// Get specific class data
router.get('/classes/:classId', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate('students', 'name email parentName parentEmail parentMobile')
      .populate('teachers', 'name email')
      .populate('teacher', 'name email');

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classData);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== RESOURCE MANAGEMENT ROUTES ====================

// Get resources for a specific class
router.get('/classes/:classId/resources', auth, async (req, res) => {
  try {
    const { subject } = req.query;
    const filter = {
      classId: req.params.classId,
      teacher: req.user._id
    };

    if (subject) {
      if (Array.isArray(subject)) {
        filter.subject = { $in: subject };
      } else {
        filter.subject = subject;
      }
    }

    const resources = await Resource.find(filter)
      .sort({ uploadDate: -1 });

    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload resource
router.post('/resources/upload', auth, resourceUpload.single('file'), async (req, res) => {
  try {
    const { title, description, subject, classId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!title || !subject || !classId) {
      return res.status(400).json({ message: 'Title, subject, and class ID are required' });
    }

    const classData = await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classData.subjects && classData.subjects.length > 0 && !classData.subjects.includes(subject)) {
      return res.status(400).json({ message: 'Subject not found in this class' });
    }

    const resource = new Resource({
      title,
      description,
      subject,
      classId,
      filename: req.file.originalname,
      filepath: req.file.path,
      filesize: req.file.size,
      mimetype: req.file.mimetype,
      teacher: req.user._id,
      uploadDate: new Date()
    });

    await resource.save();
    res.status(201).json({ message: 'Resource uploaded successfully', resource });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Download resource (continued)
router.get('/resources/:id/download', auth, async (req, res) => {
  try {
    const resource = await Resource.findOne({
      _id: req.params.id,
      teacher: req.user._id
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

// Delete resource
router.delete('/resources/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findOne({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (fs.existsSync(resource.filepath)) {
      fs.unlinkSync(resource.filepath);
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
});

// ==================== ASSIGNMENT ROUTES ====================

// Get all assignments for a class
router.get('/classes/:classId/assignments', auth, checkRole(['teacher']), async (req, res) => {
  try {

    const { classId } = req.params;

    // Verify teacher owns this class
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teachers: req.user._id },
        { teacher: req.user._id }
      ]
    });

    if (!classDoc) {
      
      return res.status(404).json({ message: 'Class not found' });
    }

    const assignments = await Assignment.find({ class: classId })
      .populate('class', 'name')
      .sort({ createdAt: -1 });


    // Add submission count for each assignment
    const assignmentsWithCount = await Promise.all(
      assignments.map(async (assignment) => {
        const submissionCount = await Submission.countDocuments({ assignment: assignment._id });
        return {
          ...assignment.toObject(),
          submissionCount
        };
      })
    );

    res.json(assignmentsWithCount);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new assignment
router.post('/classes/:classId/assignments', auth, checkRole(['teacher']), assignmentUpload.array('attachments', 5), async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, dueDate, totalMarks, instructions } = req.body;

    // Verify teacher owns this class
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teachers: req.user._id },
        { teacher: req.user._id }
      ]
    });

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Process attachments
    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      url: `/uploads/assignments/${file.filename}`,
      size: file.size
    })) : [];

    const assignment = new Assignment({
      title,
      description,
      dueDate: new Date(dueDate),
      totalMarks: parseInt(totalMarks),
      instructions,
      attachments,
      class: classId,
      teacher: req.user._id
    });

    await assignment.save();
    await assignment.populate('class', 'name');

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update assignment
router.put('/assignments/:assignmentId', auth, checkRole(['teacher']), assignmentUpload.array('attachments', 5), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { title, description, dueDate, totalMarks, instructions } = req.body;

    const assignment = await Assignment.findOne({ _id: assignmentId, teacher: req.user._id });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Process new attachments if any
    let attachments = assignment.attachments;
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/assignments/${file.filename}`,
        size: file.size
      }));
      attachments = [...attachments, ...newAttachments];
    }

    assignment.title = title;
    assignment.description = description;
    assignment.dueDate = new Date(dueDate);
    assignment.totalMarks = parseInt(totalMarks);
    assignment.instructions = instructions;
    assignment.attachments = attachments;
    assignment.updatedAt = new Date();

    await assignment.save();
    await assignment.populate('class', 'name');

    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete assignment
router.delete('/assignments/:assignmentId', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findOne({ _id: assignmentId, teacher: req.user._id });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Delete all submissions for this assignment
    await Submission.deleteMany({ assignment: assignmentId });

    // Delete the assignment
    await Assignment.findByIdAndDelete(assignmentId);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get submissions for an assignment
router.get('/assignments/:assignmentId/submissions', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Verify teacher owns this assignment
    const assignment = await Assignment.findOne({ _id: assignmentId, teacher: req.user._id });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const submissions = await Submission.find({ assignment: assignmentId })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade a submission
router.put('/submissions/:submissionId/grade', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marks, feedback } = req.body;

    const submission = await Submission.findById(submissionId)
      .populate('assignment', 'teacher totalMarks');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify teacher owns the assignment
    if (submission.assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate marks
    if (marks < 0 || marks > submission.assignment.totalMarks) {
      return res.status(400).json({
        message: `Marks must be between 0 and ${submission.assignment.totalMarks}`
      });
    }

    submission.marks = parseInt(marks);
    submission.feedback = feedback;
    submission.isGraded = true;
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;

    await submission.save();
    await submission.populate('student', 'name email');

    res.json(submission);
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== TIMETABLE ROUTES ====================

// Get timetable entries
// Get timetable entries - FIXED VERSION
router.get('/timetable', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId } = req.query;

    // Build query based on user access
    let query = { 
      isActive: true,
      teacher: req.user._id  // ADD THIS LINE - Only show entries for current teacher
    };
    
    if (classId) {
      // If specific class requested, verify access and filter
      const classDoc = await Class.findOne({
        _id: classId,
        $or: [
          { teacher: req.user._id },
          { teachers: req.user._id }
        ]
      });

      if (!classDoc) {
        return res.status(404).json({
          success: false,
          error: 'Class not found or access denied'
        });
      }
      
      query.class = classId;
    } else {
      // Get all classes the teacher has access to
      const teacherClasses = await Class.find({
        $or: [
          { teacher: req.user._id },
          { teachers: req.user._id }
        ]
      }).select('_id');
      
      const classIds = teacherClasses.map(c => c._id);
      query.class = { $in: classIds };
    }

    console.log('Timetable query:', query); // Debug log

    const timetableEntries = await Timetable.find(query)
      .populate('teacher', 'name email')
      .populate('class', 'name')
      .sort({ day: 1, time: 1 });

    console.log('Found timetable entries:', timetableEntries.length); // Debug log

    // Transform data to match frontend expectations
    const transformedEntries = timetableEntries.map(entry => {
      return {
        id: entry._id.toString(),
        subject: entry.subject,
        teacher: entry.teacher?.name || 'Unknown Teacher',
        teacherId: entry.teacher?._id?.toString() || '',
        room: entry.room,
        day: entry.day,
        time: entry.time,
        class: entry.class?.name || 'Unknown Class',
        classId: entry.class?._id?.toString() || '',
        notes: entry.notes || '',
        color: 'blue'
      };
    });

    res.json({
      success: true,
      data: transformedEntries,
      count: transformedEntries.length
    });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timetable entries',
      details: error.message
    });
  }
});



//create a timetable entry
router.post('/timetable', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { subject, room, day, time, classId, teacherId, notes } = req.body;

    // Validate required fields
    if (!subject || !room || !day || !time || !classId || !teacherId) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: subject, room, day, time, classId, teacherId'
      });
    }

    // Verify the requesting teacher has access to the class
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    });

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or access denied'
      });
    }

    // Verify the selected teacher is assigned to this class
    const isTeacherAssigned = classDoc.teacher?.toString() === teacherId || 
                             classDoc.teachers?.some(t => t.toString() === teacherId);

    if (!isTeacherAssigned) {
      return res.status(400).json({
        success: false,
        error: 'Selected teacher is not assigned to this class'
      });
    }

    // Import Timetable model
    const Timetable = require('../models/TimeTable');

    // Check for existing entry at the same time slot for the same class
    const existingEntry = await Timetable.findOne({
      class: classId,
      day: day,
      time: time,
      isActive: true
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        error: `Time slot ${time} on ${day} is already occupied by ${existingEntry.subject}`
      });
    }

    // Create new timetable entry with the selected teacher
    const newEntry = new Timetable({
      subject: subject.trim(),
      room: room.trim(),
      day: day.trim(),
      time: time.trim(),
      class: classId,
      teacher: teacherId, // Use the selected teacher instead of req.user._id
      createdBy: req.user._id, // Keep track of who created it
      notes: notes ? notes.trim() : undefined
    });

    await newEntry.save();

    await newEntry.populate('teacher', 'name');
    await newEntry.populate('class', 'name');

    // Transform response to match frontend expectations
    const transformedEntry = {
      id: newEntry._id,
      subject: newEntry.subject,
      teacher: newEntry.teacher.name,
      teacherId: newEntry.teacher._id,
      room: newEntry.room,
      day: newEntry.day,
      time: newEntry.time,
      class: newEntry.class.name,
      classId: newEntry.class._id,
      notes: newEntry.notes
    };

    res.status(201).json({
      success: true,
      data: transformedEntry,
      message: 'Timetable entry created successfully'
    });

  } catch (error) {
    console.error('Error creating timetable entry:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        success: false,
        error: `Duplicate entry detected. This ${field} combination already exists.`
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format provided'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create timetable entry. Please try again.'
    });
  }
});

//


// Update timetable entry
router.put('/timetable/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, room, day, time, classId, teacherId, notes } = req.body;

    const Timetable = require('../models/TimeTable');

    // Find the entry and verify ownership (either created by current user or current user has access to the class)
    const entry = await Timetable.findById(id).populate('class');

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Timetable entry not found'
      });
    }

    // Verify the requesting teacher has access to modify this entry
    const hasAccess = entry.createdBy?.toString() === req.user._id.toString() ||
                     entry.class.teacher?.toString() === req.user._id.toString() ||
                     entry.class.teachers?.some(t => t.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to modify this timetable entry'
      });
    }

    // If classId is being changed, verify access to new class
    if (classId && classId !== entry.class._id.toString()) {
      const classDoc = await Class.findOne({
        _id: classId,
        $or: [
          { teacher: req.user._id },
          { teachers: req.user._id }
        ]
      });

      if (!classDoc) {
        return res.status(404).json({
          success: false,
          error: 'New class not found or access denied'
        });
      }

      // Verify the selected teacher is assigned to the new class
      if (teacherId) {
        const isTeacherAssigned = classDoc.teacher?.toString() === teacherId || 
                                 classDoc.teachers?.some(t => t.toString() === teacherId);

        if (!isTeacherAssigned) {
          return res.status(400).json({
            success: false,
            error: 'Selected teacher is not assigned to this class'
          });
        }
      }
    } else if (teacherId) {
      // If only teacher is being changed, verify they're assigned to current class
      const currentClass = await Class.findById(entry.class._id);
      const isTeacherAssigned = currentClass.teacher?.toString() === teacherId || 
                               currentClass.teachers?.some(t => t.toString() === teacherId);

      if (!isTeacherAssigned) {
        return res.status(400).json({
          success: false,
          error: 'Selected teacher is not assigned to this class'
        });
      }
    }

    // Check for conflicts if day, time, or class is being changed
    if (day || time || classId) {
      const checkDay = day || entry.day;
      const checkTime = time || entry.time;
      const checkClass = classId || entry.class._id;

      const conflictEntry = await Timetable.findOne({
        _id: { $ne: id }, // Exclude current entry
        class: checkClass,
        day: checkDay,
        time: checkTime,
        isActive: true
      });

      if (conflictEntry) {
        return res.status(400).json({
          success: false,
          error: `Time slot ${checkTime} on ${checkDay} is already occupied by ${conflictEntry.subject}`
        });
      }
    }

    // Update the entry
    if (subject) entry.subject = subject;
    if (room) entry.room = room;
    if (day) entry.day = day;
    if (time) entry.time = time;
    if (classId) entry.class = classId;
    if (teacherId) entry.teacher = teacherId;
    if (notes !== undefined) entry.notes = notes;

    await entry.save();
    await entry.populate('teacher', 'name');
    await entry.populate('class', 'name');

    const transformedEntry = {
      id: entry._id,
      subject: entry.subject,
      teacher: entry.teacher.name,
      teacherId: entry.teacher._id,
      room: entry.room,
      day: entry.day,
      time: entry.time,
      class: entry.class.name,
      classId: entry.class._id,
      notes: entry.notes
    };

    res.json({
      success: true,
      data: transformedEntry,
      message: 'Timetable entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating timetable entry:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'This time slot is already occupied for this class'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update timetable entry'
    });
  }
});

// Delete timetable entry
router.delete('/timetable/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const Timetable = require('../models/TimeTable');

    // Find and verify ownership
    const entry = await Timetable.findOne({
      _id: id,
      $or: [
        { teacher: req.user._id },
        { createdBy: req.user._id }
      ]
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Timetable entry not found or access denied'
      });
    }

    // Actually delete the entry instead of soft delete
    await Timetable.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete timetable entry'
    });
  }
});

// Delete timetable entry
router.delete('/timetable/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { id } = req.params;

    // Find and verify ownership
    const entry = await Timetable.findOne({
      _id: id,
      $or: [
        { teacher: req.user._id },
        { createdBy: req.user._id }
      ]
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Timetable entry not found or access denied'
      });
    }

    // Soft delete by setting isActive to false
    entry.isActive = false;
    await entry.save();

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete timetable entry'
    });
  }
});

// Get available classes for timetable
router.get('/timetable/classes', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const classes = await Class.find({
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    }).select('_id name subjects');

    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error fetching classes for timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch classes'
    });
  }
});

// Get timetable statistics
router.get('/timetable/stats', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId } = req.query;

    const query = {
      teacher: req.user._id,
      isActive: true
    };

    if (classId) {
      query.class = classId;
    }

    const totalEntries = await Timetable.countDocuments(query);

    // Get entries by day
    const entriesByDay = await Timetable.aggregate([
      { $match: query },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get entries by subject
    const entriesBySubject = await Timetable.aggregate([
      { $match: query },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalEntries,
        entriesByDay,
        entriesBySubject
      }
    });
  } catch (error) {
    console.error('Error fetching timetable statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timetable statistics'
    });
  }
});

// ==================== REMAINING ROUTES (STUDENT MANAGEMENT, ANNOUNCEMENTS, etc.) ====================

// Get all students
router.get('/students', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new student
router.post('/students', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { name, email, password, parentName, parentEmail, parentMobile } = req.body;

    // Check if student already exists
    const existingStudent = await User.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const newStudent = new User({
      name,
      email,
      password,
      parentName,
      parentEmail,
      parentMobile,
      role: 'student'
    });

    await newStudent.save();

    // Remove password from response
    const studentResponse = newStudent.toObject();
    delete studentResponse.password;

    res.status(201).json(studentResponse);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update a student
router.put('/students/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { name, email, password, parentName, parentEmail, parentMobile } = req.body;
    const studentId = req.params.id;

    // Check if student exists
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email !== student.email) {
      const existingStudent = await User.findOne({ email });
      if (existingStudent) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Update student
    student.name = name;
    student.email = email;
    student.parentName = parentName;
    student.parentEmail = parentEmail;
    student.parentMobile = parentMobile;

    // Only update password if a new one is provided
    if (password) {
      student.password = password;
    }

    await student.save();

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json(studentResponse);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete a student
router.delete('/students/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const studentId = req.params.id;

    // Check if student exists
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student is assigned to any classes
    const assignedClasses = await Class.find({ students: studentId });
    if (assignedClasses.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete student who is assigned to classes. Please unassign from all classes first.'
      });
    }

    // Delete student
    await User.deleteOne({ _id: studentId });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CLASS-STUDENT MANAGEMENT ROUTES ====================

// Assign student to class
router.post('/classes/:classId/students', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { studentId } = req.body;
    const classId = req.params.classId;

    // Check if class exists and belongs to the teacher
    const classToUpdate = await Class.findOne({
      _id: classId,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    });

    if (!classToUpdate) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if student exists
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student is already in the class
    if (classToUpdate.students.includes(studentId)) {
      return res.status(400).json({ error: 'Student is already in this class' });
    }

    // Add student to class
    classToUpdate.students.push(studentId);
    await classToUpdate.save();

    res.json({ message: 'Student assigned to class successfully' });
  } catch (error) {
    console.error('Error assigning student to class:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unassign student from class
router.delete('/classes/:classId/students/:studentId', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    // Check if class exists and belongs to the teacher
    const classToUpdate = await Class.findOne({
      _id: classId,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    });

    if (!classToUpdate) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if student is in the class
    if (!classToUpdate.students.includes(studentId)) {
      return res.status(400).json({ error: 'Student is not in this class' });
    }

    // Remove student from class
    classToUpdate.students = classToUpdate.students.filter(id => id.toString() !== studentId);
    await classToUpdate.save();

    res.json({ message: 'Student unassigned from class successfully' });
  } catch (error) {
    console.error('Error unassigning student from class:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a class
router.delete('/classes/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const classToDelete = await Class.findOne({
      _id: req.params.id,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    });

    if (!classToDelete) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if class has students
    if (classToDelete.students && classToDelete.students.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete class with assigned students. Please unassign all students first.'
      });
    }

    await Class.deleteOne({ _id: req.params.id });
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANNOUNCEMENT ROUTES ====================

// Create a new announcement
router.post('/announcements', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { title, description, classId } = req.body;

    // Check if class exists and belongs to teacher
    const classExists = await Class.findOne({
      _id: classId,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    });

    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const announcement = new Announcement({
      title,
      description,
      class: classId,
      teacher: req.user._id
    });

    await announcement.save();
    await announcement.populate('class', 'name');

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all announcements for a teacher
router.get('/announcements', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const announcements = await Announcement.find({ teacher: req.user._id })
      .populate('class', 'name')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific announcement
router.get('/announcements/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      _id: req.params.id,
      teacher: req.user._id
    }).populate('class', 'name');

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an announcement (continued)
router.put('/announcements/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { title, description, classId } = req.body;

    // Check if class exists and belongs to teacher
    if (classId) {
      const classExists = await Class.findOne({
        _id: classId,
        $or: [
          { teacher: req.user._id },
          { teachers: req.user._id }
        ]
      });

      if (!classExists) {
        return res.status(404).json({ error: 'Class not found' });
      }
    }

    const announcement = await Announcement.findOne({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Update fields
    announcement.title = title || announcement.title;
    announcement.description = description || announcement.description;
    announcement.class = classId || announcement.class;

    await announcement.save();
    await announcement.populate('class', 'name');

    res.json(announcement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete an announcement
router.delete('/announcements/:id', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user._id
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ASSESSMENT ROUTES ====================

// Get all assessments for a class
router.get('/classes/:classId/assessments', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify teacher owns this class
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teachers: req.user._id },
        { teacher: req.user._id }
      ]
    });

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or access denied'
      });
    }

    const assessments = await Assessment.find({ class: classId })
      .populate('class', 'name subject')
      .populate('teacher', 'name')
      .sort({ date: -1 });

    // Calculate graded count and total students for each assessment
    const assessmentsWithStats = await Promise.all(
      assessments.map(async (assessment) => {
        const gradedCount = await Grade.countDocuments({ assessment: assessment._id });
        const totalStudents = classDoc.students ? classDoc.students.length : 0;

        // Update assessment status based on graded count
        let status = 'pending';
        if (gradedCount > 0 && gradedCount < totalStudents) {
          status = 'in-progress';
        } else if (gradedCount === totalStudents && totalStudents > 0) {
          status = 'completed';
        }

        // Update the assessment if status changed
        if (assessment.status !== status || assessment.gradedCount !== gradedCount || assessment.totalStudents !== totalStudents) {
          await Assessment.findByIdAndUpdate(assessment._id, {
            status,
            gradedCount,
            totalStudents
          });
        }

        return {
          ...assessment.toObject(),
          gradedCount,
          totalStudents,
          status
        };
      })
    );

    res.json({
      success: true,
      data: assessmentsWithStats
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assessments'
    });
  }
});

// Add this new route to get class details with subjects
router.get('/classes/:classId/details', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify teacher owns this class and get full details
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teachers: req.user._id },
        { teacher: req.user._id }
      ]
    })
      .populate('students', 'name email')
      .populate('teachers', 'name email')
      .populate('teacher', 'name email');

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        _id: classDoc._id,
        name: classDoc.name,
        subjects: classDoc.subjects || [],
        students: classDoc.students || [],
        teachers: classDoc.teachers || [],
        teacher: classDoc.teacher,
        description: classDoc.description,
        createdAt: classDoc.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching class details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching class details'
    });
  }
});



//get today lectures of current teacher
router.get('/timetable/mylectures', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // Get current day name
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[today.getDay()];
    
    // Find today's lectures for the teacher - ALREADY CORRECT
    const todayLectures = await Timetable.find({
      teacher: teacherId,  // This is already filtering by teacher
      day: currentDay,
      isActive: true
    })
    .populate('class', 'name')
    .sort({ time: 1 });
    
    // Transform the data to include parsed time for better sorting
    const lecturesWithParsedTime = todayLectures.map(lecture => {
      const timeStart = lecture.time.split(' - ')[0];
      return {
        _id: lecture._id,
        subject: lecture.subject,
        class: lecture.class.name,
        classId: lecture.class._id,
        room: lecture.room,
        time: lecture.time,
        timeStart: timeStart,
        notes: lecture.notes
      };
    });
    
    res.json({
      success: true,
      data: {
        lectures: lecturesWithParsedTime,
        count: lecturesWithParsedTime.length,
        day: currentDay,
        date: today.toISOString().split('T')[0]
      }
    });
    
  } catch (error) {
    console.error('Error getting today\'s lectures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s lectures'
    });
  }
});

// Add these routes to the existing teacher.js file

// ==================== ATTENDANCE ROUTES ====================

// Get today's lectures for attendance
router.get('/attendance/today-lectures', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { classId } = req.query;
    
    // Get current day and time
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    // Build query
    let query = {
      teacher: teacherId,
      day: currentDay,
      isActive: true
    };
    
    if (classId) {
      query.class = classId;
    }
    
    const todayLectures = await Timetable.find(query)
      .populate('class', 'name students')
      .populate('teacher', 'name')
      .sort({ time: 1 });
    
    // Check which lectures can have attendance taken (period has started)
    const lecturesWithStatus = await Promise.all(
      todayLectures.map(async (lecture) => {
        const timeStart = lecture.time.split(' - ')[0];
        const timeEnd = lecture.time.split(' - ')[1];
        
        // Check if current time is within or after the lecture period
        const canTakeAttendance = currentTime >= timeStart;
        const isOngoing = currentTime >= timeStart && currentTime <= timeEnd;
        const isCompleted = currentTime > timeEnd;
        
        // Check if attendance already exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const existingAttendance = await Attendance.findOne({
          timetableEntry: lecture._id,
          date: {
            $gte: today,
            $lt: tomorrow
          }
        });
        
        return {
          _id: lecture._id,
          subject: lecture.subject,
          class: {
            _id: lecture.class._id,
            name: lecture.class.name,
            studentCount: lecture.class.students ? lecture.class.students.length : 0
          },
          room: lecture.room,
          time: lecture.time,
          timeStart,
          timeEnd,
          canTakeAttendance,
          isOngoing,
          isCompleted,
          hasAttendance: !!existingAttendance,
          attendanceId: existingAttendance?._id,
          attendanceStatus: existingAttendance?.isCompleted ? 'completed' : 'pending'
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        lectures: lecturesWithStatus,
        currentTime,
        currentDay,
        date: now.toISOString().split('T')[0]
      }
    });
    
  } catch (error) {
    console.error('Error getting today\'s lectures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s lectures'
    });
  }
});

// Start attendance for a lecture
router.post('/attendance/start', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { timetableEntryId, classId } = req.body;
    
    // Verify the timetable entry belongs to the teacher
    const timetableEntry = await Timetable.findOne({
      _id: timetableEntryId,
      teacher: req.user._id,
      isActive: true
    }).populate('class', 'name students');
    
    if (!timetableEntry) {
      return res.status(404).json({
        success: false,
        error: 'Timetable entry not found or access denied'
      });
    }
    
    // Check if current time allows taking attendance
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const timeStart = timetableEntry.time.split(' - ')[0];
    
    if (currentTime < timeStart) {
      return res.status(400).json({
        success: false,
        error: 'Cannot take attendance before the lecture period starts'
      });
    }
    
    // Check if attendance already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingAttendance = await Attendance.findOne({
      timetableEntry: timetableEntryId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Attendance already exists for this lecture today',
        attendanceId: existingAttendance._id
      });
    }
    
    // Get class details with students
    const classDetails = await Class.findById(timetableEntry.class._id)
      .populate('students', 'name email');
    
    if (!classDetails || !classDetails.students || classDetails.students.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No students found in this class'
      });
    }
    
    // Create attendance record with all students marked as absent initially
    const attendanceRecords = classDetails.students.map(student => ({
      student: student._id,
      status: 'absent',
      markedBy: req.user._id,
      markedAt: new Date()
    }));
    
    const attendance = new Attendance({
      class: timetableEntry.class._id,
      subject: timetableEntry.subject,
      date: today,
      timeSlot: timetableEntry.time,
      day: timetableEntry.day,
      teacher: req.user._id,
      timetableEntry: timetableEntryId,
      room: timetableEntry.room,
      records: attendanceRecords
    });
    
    await attendance.save();
    
    // Populate the attendance with student details
    await attendance.populate('records.student', 'name email');
    
    res.status(201).json({
      success: true,
      data: attendance,
      message: 'Attendance session started successfully'
    });
    
  } catch (error) {
    console.error('Error starting attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start attendance session'
    });
  }
});

// Get attendance details
router.get('/attendance/:attendanceId', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { attendanceId } = req.params;
    
    const attendance = await Attendance.findOne({
      _id: attendanceId,
      teacher: req.user._id
    })
    .populate('class', 'name')
    .populate('records.student', 'name email')
    .populate('teacher', 'name');
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }
    
    res.json({
      success: true,
      data: attendance
    });
    
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance record'
    });
  }
});

// Update attendance (mark students)
router.put('/attendance/:attendanceId', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { records, notes, isCompleted } = req.body;
    
    const attendance = await Attendance.findOne({
      _id: attendanceId,
      teacher: req.user._id
    });
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }
    
    // Update attendance records
    if (records && Array.isArray(records)) {
      records.forEach(updateRecord => {
        const existingRecord = attendance.records.find(
          record => record.student.toString() === updateRecord.studentId
        );
        
        if (existingRecord) {
          existingRecord.status = updateRecord.status;
          existingRecord.markedAt = new Date();
          existingRecord.markedBy = req.user._id;
          if (updateRecord.notes) {
            existingRecord.notes = updateRecord.notes;
          }
        }
      });
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      attendance.notes = notes;
    }
    
    // Mark as completed if specified
    if (isCompleted !== undefined) {
      attendance.isCompleted = isCompleted;
      if (isCompleted) {
        attendance.completedAt = new Date();
      }
    }
    
    await attendance.save();
    
    // Populate and return updated attendance
    await attendance.populate('records.student', 'name email');
    
    res.json({
      success: true,
      data: attendance,
      message: 'Attendance updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update attendance'
    });
  }
});

// Get attendance history for a class
router.get('/attendance/class/:classId/history', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate, subject } = req.query;
    
    // Verify teacher has access to this class
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    });
    
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or access denied'
      });
    }
    
    // Build query
    let query = {
      class: classId,
      teacher: req.user._id
    };
    
    // Add date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Add subject filter
    if (subject) {
      query.subject = subject;
    }
    
    const attendanceHistory = await Attendance.find(query)
      .populate('class', 'name')
      .populate('teacher', 'name')
      .sort({ date: -1, timeSlot: 1 });
    
    // Get attendance statistics
    const stats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          averageAttendance: { $avg: '$attendancePercentage' },
          totalPresent: { $sum: '$presentCount' },
          totalAbsent: { $sum: '$absentCount' },
          totalLate: { $sum: '$lateCount' },
          completedSessions: {
            $sum: { $cond: ['$isCompleted', 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        history: attendanceHistory,
        statistics: stats[0] || {
          totalSessions: 0,
          averageAttendance: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          completedSessions: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance history'
    });
  }
});

// Get student attendance summary
router.get('/attendance/student/:studentId/summary', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, startDate, endDate } = req.query;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'Class ID is required'
      });
    }
    
    // Verify teacher has access to this class
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    });
    
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or access denied'
      });
    }
    
    // Build date range
    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    
    // Get student attendance records
    const attendanceRecords = await Attendance.find({
      class: classId,
      teacher: req.user._id,
      ...(Object.keys(dateQuery).length > 0 && { date: dateQuery }),
      'records.student': studentId
    })
    .populate('records.student', 'name email')
    .sort({ date: -1 });
    
    // Calculate summary
    let totalSessions = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    
    const detailedRecords = [];
    
    attendanceRecords.forEach(attendance => {
      const studentRecord = attendance.records.find(
        record => record.student._id.toString() === studentId
      );
      
      if (studentRecord) {
        totalSessions++;
        
        switch (studentRecord.status) {
          case 'present':
            presentCount++;
            break;
          case 'absent':
            absentCount++;
            break;
          case 'late':
            lateCount++;
            break;
        }
        
        detailedRecords.push({
          date: attendance.date,
          subject: attendance.subject,
          timeSlot: attendance.timeSlot,
          status: studentRecord.status,
          markedAt: studentRecord.markedAt,
          notes: studentRecord.notes
        });
      }
    });
    
    const attendancePercentage = totalSessions > 0 
      ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
      : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          attendancePercentage
        },
        records: detailedRecords
      }
    });
    
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student attendance summary'
    });
  }
});

// Delete attendance record
router.delete('/attendance/:attendanceId', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { attendanceId } = req.params;
    
    const attendance = await Attendance.findOne({
      _id: attendanceId,
      teacher: req.user._id
    });
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }
    
    await Attendance.findByIdAndDelete(attendanceId);
    
    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attendance record'
    });
  }
});

// Add this at the end of the existing teacher.js routes file, just before module.exports = router;

// Get attendance statistics for dashboard
router.get('/attendance/stats', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId, period = '30' } = req.query; // period in days
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    let query = {
      teacher: req.user._id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (classId) {
      query.class = classId;
    }
    
    const stats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          averageAttendance: { $avg: '$attendancePercentage' },
          totalStudentsMarked: { $sum: '$totalStudents' },
          totalPresent: { $sum: '$presentCount' },
          totalAbsent: { $sum: '$absentCount' },
          totalLate: { $sum: '$lateCount' },
          completedSessions: {
            $sum: { $cond: ['$isCompleted', 1, 0] }
          }
                }
      }
    ]);

    // Get attendance trends by day
    const trendData = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          sessionsCount: { $sum: 1 },
          averageAttendance: { $avg: '$attendancePercentage' },
          totalPresent: { $sum: '$presentCount' },
          totalStudents: { $sum: '$totalStudents' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get subject-wise attendance
    const subjectStats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$subject',
          sessionsCount: { $sum: 1 },
          averageAttendance: { $avg: '$attendancePercentage' },
          totalPresent: { $sum: '$presentCount' },
          totalStudents: { $sum: '$totalStudents' }
        }
      },
      { $sort: { averageAttendance: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalSessions: 0,
          averageAttendance: 0,
          totalStudentsMarked: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          completedSessions: 0
        },
        trends: trendData,
        subjectStats: subjectStats
      }
    });

  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance statistics'
    });
  }
});

// Export attendance data
router.get('/attendance/export', auth, checkRole(['teacher']), async (req, res) => {
  try {
    const { classId, format = 'json', startDate, endDate } = req.query;
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'Class ID is required'
      });
    }

    // Verify teacher has access to this class
    const classDoc = await Class.findOne({
      _id: classId,
      $or: [
        { teacher: req.user._id },
        { teachers: req.user._id }
      ]
    }).populate('students', 'name email');

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or access denied'
      });
    }

    // Build date query
    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      class: classId,
      teacher: req.user._id,
      ...(Object.keys(dateQuery).length > 0 && { date: dateQuery })
    })
    .populate('records.student', 'name email')
    .sort({ date: -1 });

    if (format === 'csv') {
      // Generate CSV format
      let csvContent = 'Date,Subject,Time Slot,Student Name,Student Email,Status,Marked At\n';
      
      attendanceRecords.forEach(attendance => {
        attendance.records.forEach(record => {
          csvContent += `${attendance.date.toISOString().split('T')[0]},`;
          csvContent += `${attendance.subject},`;
          csvContent += `${attendance.timeSlot},`;
          csvContent += `${record.student.name},`;
          csvContent += `${record.student.email},`;
          csvContent += `${record.status},`;
          csvContent += `${record.markedAt ? record.markedAt.toISOString() : ''}\n`;
        });
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${classDoc.name}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: {
          class: {
            name: classDoc.name,
            students: classDoc.students
          },
          records: attendanceRecords,
          exportedAt: new Date(),
          totalRecords: attendanceRecords.length
        }
      });
    }

  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export attendance data'
    });
  }
});


module.exports = router;
