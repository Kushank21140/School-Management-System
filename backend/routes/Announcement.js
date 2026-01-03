const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, checkRole } = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const Class = require('../models/Class');

// Middleware to check and update expired announcements on every request
const checkExpiredAnnouncements = async (req, res, next) => {
    try {
        const result = await Announcement.updateMany(
            {
                expiryDate: { $lt: new Date() },
                status: { $ne: 'expired' }
            },
            {
                status: 'expired',
                updatedAt: new Date()
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`[${new Date().toISOString()}] Auto-updated ${result.modifiedCount} expired announcements`);
        }
        
        next();
    } catch (error) {
        console.error('Error checking expired announcements:', error);
        // Continue with the request even if expiry check fails
        next();
    }
};

// Apply the middleware to all announcement routes
router.use(checkExpiredAnnouncements);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/announcements/';
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

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed'));
        }
    }
});

// Helper function to check if user is a teacher of the class
const isTeacherOfClass = (classData, userId) => {
    // Check if teachers field exists and is an array
    if (classData.teachers && Array.isArray(classData.teachers)) {
        return classData.teachers.some(teacherId => teacherId.toString() === userId.toString());
    }
    // Fallback to single teacher field if it exists
    if (classData.teacher) {
        return classData.teacher.toString() === userId.toString();
    }
    return false;
};

// Get all announcements for a specific class
router.get('/class/:classId', auth, async (req, res) => {
    try {
        const { classId } = req.params;

        // Verify user has access to this class
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Check if user has access to this class
        const isTeacher = isTeacherOfClass(classData, req.user._id);
        const isStudent = classData.students && classData.students.includes(req.user._id);
        const isAdmin = req.user.role === 'admin';

        if (!isTeacher && !isStudent && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have access to this class.'
            });
        }

        const announcements = await Announcement.find({
            classId: classId,
            ...(req.user.role === 'student' ? { status: 'active' } : {})
        })
            .populate('teacherId', 'name email')
            .populate('classId', 'name subject')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                announcements,
                total: announcements.length
            }
        });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching announcements',
            error: error.message
        });
    }
});

// Get single announcement
router.get('/:id', auth, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id)
            .populate('teacherId', 'name email')
            .populate('classId', 'name subject');

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check access permissions
        const classData = await Class.findById(announcement.classId._id);
        const isTeacher = isTeacherOfClass(classData, req.user._id);
        const isStudent = classData.students && classData.students.includes(req.user._id);
        const isAdmin = req.user.role === 'admin';

        if (!isTeacher && !isStudent && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Mark as read for students
        if (req.user.role === 'student' && !announcement.readBy.includes(req.user._id)) {
            announcement.readBy.push(req.user._id);
            await announcement.save();
        }

        res.json({
            success: true,
            data: announcement
        });
    } catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching announcement',
            error: error.message
        });
    }
});

// Create new announcement
router.post('/', auth, checkRole(['teacher', 'admin']), upload.array('attachments', 5), async (req, res) => {
    try {
        const { title, content, priority, classId, expiryDate } = req.body;

        // Verify class exists and user has permission
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        const isTeacher = isTeacherOfClass(classData, req.user._id);
        const isAdmin = req.user.role === 'admin';

        if (!isTeacher && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only create announcements for classes you teach.'
            });
        }

        // Process attachments
        const attachments = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                attachments.push({
                    originalName: file.originalname,
                    filename: file.filename,
                    url: `/uploads/announcements/${file.filename}`,
                    size: file.size,
                    mimetype: file.mimetype
                });
            });
        }

        const announcementData = {
            title,
            content,
            priority: priority || 'normal',
            classId,
            teacherId: req.user._id,
            attachments,
            status: 'active'
        };

        // Handle expiry date with proper timezone conversion
        if (expiryDate) {
            const expiry = new Date(expiryDate);
            // Ensure the date is valid
            if (!isNaN(expiry.getTime())) {
                announcementData.expiryDate = expiry;
                // Check if the announcement is already expired at creation time
                if (expiry < new Date()) {
                    announcementData.status = 'expired';
                }
            }
        }

        const announcement = new Announcement(announcementData);
        await announcement.save();

        // Populate before sending response
        await announcement.populate([
            { path: 'teacherId', select: 'name email' },
            { path: 'classId', select: 'name subject' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            data: announcement
        });
    } catch (error) {
        console.error('Error creating announcement:', error);

        // Clean up uploaded files if announcement creation fails
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating announcement',
            error: error.message
        });
    }
});

// Update announcement
router.put('/:id', auth, checkRole(['teacher', 'admin']), upload.array('attachments', 5), async (req, res) => {
    try {
        const { title, content, priority, expiryDate } = req.body;

        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check permissions - either the creator or admin or another teacher of the same class
        const isOwner = announcement.teacherId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        // Check if current user is a teacher of the class
        const classData = await Class.findById(announcement.classId);
        const isClassTeacher = isTeacherOfClass(classData, req.user._id);

        if (!isOwner && !isAdmin && !isClassTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only edit announcements for classes you teach.'
            });
        }

        // Update fields
        if (title) announcement.title = title;
        if (content) announcement.content = content;
        if (priority) announcement.priority = priority;

        // Handle expiry date update
        if (expiryDate) {
            const expiry = new Date(expiryDate);
            if (!isNaN(expiry.getTime())) {
                announcement.expiryDate = expiry;
                // Check if the updated expiry date makes it expired
                if (expiry < new Date()) {
                    announcement.status = 'expired';
                }
            }
        } else if (expiryDate === '') {
            announcement.expiryDate = undefined;
        }

        // Handle new attachments
        if (req.files && req.files.length > 0) {
            const newAttachments = req.files.map(file => ({
                originalName: file.originalname,
                filename: file.filename,
                url: `/uploads/announcements/${file.filename}`,
                size: file.size,
                mimetype: file.mimetype
            }));
            announcement.attachments = [...announcement.attachments, ...newAttachments];
        }

        announcement.updatedAt = new Date();
        await announcement.save();

        // Populate before sending response
        await announcement.populate([
            { path: 'teacherId', select: 'name email' },
            { path: 'classId', select: 'name subject' }
        ]);

        res.json({
            success: true,
            message: 'Announcement updated successfully',
            data: announcement
        });
    } catch (error) {
        console.error('Error updating announcement:', error);

        // Clean up uploaded files if update fails
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating announcement',
            error: error.message
        });
    }
});

// Toggle announcement status (active/inactive) - but prevent toggling expired ones
router.patch('/:id/toggle-status', auth, checkRole(['teacher', 'admin']), async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Prevent toggling status of expired announcements
        if (announcement.status === 'expired') {
            return res.status(400).json({
                success: false,
                message: 'Cannot change status of expired announcements'
            });
        }

        // Check permissions
        const isOwner = announcement.teacherId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        // Check if current user is a teacher of the class
        const classData = await Class.findById(announcement.classId);
        const isClassTeacher = isTeacherOfClass(classData, req.user._id);

        if (!isOwner && !isAdmin && !isClassTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only modify announcements for classes you teach.'
            });
        }

        // Toggle status (only between active and inactive)
        announcement.status = announcement.status === 'active' ? 'inactive' : 'active';
        announcement.updatedAt = new Date();
        await announcement.save();

        // Populate before sending response
        await announcement.populate([
            { path: 'teacherId', select: 'name email' },
            { path: 'classId', select: 'name subject' }
        ]);

        res.json({
            success: true,
            message: `Announcement ${announcement.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: announcement
        });
    } catch (error) {
        console.error('Error toggling announcement status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating announcement status',
            error: error.message
        });
    }
});

// Delete announcement - but prevent deleting expired ones
router.delete('/:id', auth, checkRole(['teacher', 'admin']), async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

              // Prevent deleting expired announcements (optional - remove if you want to allow deletion)
        if (announcement.status === 'expired') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete expired announcements'
            });
        }

        // Check permissions
        const isOwner = announcement.teacherId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        // Check if current user is a teacher of the class
        const classData = await Class.findById(announcement.classId);
        const isClassTeacher = isTeacherOfClass(classData, req.user._id);

        if (!isOwner && !isAdmin && !isClassTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete announcements for classes you teach.'
            });
        }

        // Delete associated files
        if (announcement.attachments && announcement.attachments.length > 0) {
            announcement.attachments.forEach(attachment => {
                const filePath = path.join(__dirname, '..', 'uploads', 'announcements', attachment.filename);
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            });
        }

        await Announcement.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting announcement',
            error: error.message
        });
    }
});

// Remove attachment from announcement
router.delete('/:id/attachment/:attachmentId', auth, checkRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { id, attachmentId } = req.params;
        const announcement = await Announcement.findById(id);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Prevent editing expired announcements
        if (announcement.status === 'expired') {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify expired announcements'
            });
        }

        // Check permissions
        const isOwner = announcement.teacherId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        // Check if current user is a teacher of the class
        const classData = await Class.findById(announcement.classId);
        const isClassTeacher = isTeacherOfClass(classData, req.user._id);

        if (!isOwner && !isAdmin && !isClassTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Find and remove attachment
        const attachmentIndex = announcement.attachments.findIndex(
            att => att._id.toString() === attachmentId
        );

        if (attachmentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        const attachment = announcement.attachments[attachmentIndex];

        // Delete file from filesystem
        const filePath = path.join(__dirname, '..', 'uploads', 'announcements', attachment.filename);
        fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
        });

        // Remove from array
        announcement.attachments.splice(attachmentIndex, 1);
        announcement.updatedAt = new Date();
        await announcement.save();

        // Populate before sending response
        await announcement.populate([
            { path: 'teacherId', select: 'name email' },
            { path: 'classId', select: 'name subject' }
        ]);

        res.json({
            success: true,
            message: 'Attachment removed successfully',
            data: announcement
        });
    } catch (error) {
        console.error('Error removing attachment:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing attachment',
            error: error.message
        });
    }
});

// Get announcements by teacher
router.get('/teacher/:teacherId', auth, checkRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Check if user can access this teacher's announcements
        if (req.user._id.toString() !== teacherId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const announcements = await Announcement.find({ teacherId })
            .populate('teacherId', 'name email')
            .populate('classId', 'name subject')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                announcements,
                total: announcements.length
            }
        });
    } catch (error) {
        console.error('Error fetching teacher announcements:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching announcements',
            error: error.message
        });
    }
});

// Get announcement statistics for a class
router.get('/class/:classId/stats', auth, checkRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { classId } = req.params;

        // Verify class exists and user has permission
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        const isTeacher = isTeacherOfClass(classData, req.user._id);
        const isAdmin = req.user.role === 'admin';

        if (!isTeacher && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const totalAnnouncements = await Announcement.countDocuments({ classId });
        const activeAnnouncements = await Announcement.countDocuments({
            classId,
            status: 'active'
        });
        const expiredAnnouncements = await Announcement.countDocuments({
            classId,
            status: 'expired'
        });
        const inactiveAnnouncements = await Announcement.countDocuments({
            classId,
            status: 'inactive'
        });

        // Get priority distribution
        const priorityStats = await Announcement.aggregate([
            { $match: { classId: classData._id } },
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);

        // Get recent announcements
        const recentAnnouncements = await Announcement.find({ classId })
            .populate('teacherId', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title createdAt priority status');

        res.json({
            success: true,
            data: {
                total: totalAnnouncements,
                active: activeAnnouncements,
                expired: expiredAnnouncements,
                inactive: inactiveAnnouncements,
                priorityDistribution: priorityStats,
                recent: recentAnnouncements
            }
        });
    } catch (error) {
        console.error('Error fetching announcement stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching announcement statistics',
            error: error.message
        });
    }
});

// Mark announcement as read (for students)
router.patch('/:id/mark-read', auth, checkRole(['student']), async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check if student has access to this announcement
        const classData = await Class.findById(announcement.classId);
        if (!classData.students || !classData.students.includes(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Add student to readBy array if not already present
        if (!announcement.readBy.includes(req.user._id)) {
            announcement.readBy.push(req.user._id);
            await announcement.save();
        }

        res.json({
            success: true,
            message: 'Announcement marked as read'
        });
    } catch (error) {
        console.error('Error marking announcement as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking announcement as read',
            error: error.message
        });
    }
});

// Get all announcements for a student (across all their classes)
router.get('/student/all', auth, checkRole(['student']), async (req, res) => {
    try {
        // Get all classes the student is enrolled in
        const classes = await Class.find({ students: req.user._id }).select('_id');
        const classIds = classes.map(cls => cls._id);

        const announcements = await Announcement.find({
            classId: { $in: classIds },
            status: 'active'
        })
            .populate('teacherId', 'name email')
            .populate('classId', 'name subject')
            .sort({ createdAt: -1 });

        // Mark unread announcements
        const announcementsWithReadStatus = announcements.map(announcement => ({
            ...announcement.toObject(),
            isRead: announcement.readBy.includes(req.user._id)
        }));

        res.json({
            success: true,
            data: {
                announcements: announcementsWithReadStatus,
                total: announcements.length,
                unread: announcements.filter(a => !a.readBy.includes(req.user._id)).length
            }
        });
    } catch (error) {
        console.error('Error fetching student announcements:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching announcements',
            error: error.message
        });
    }
});

// Bulk operations for announcements
router.patch('/bulk-action', auth, checkRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { action, announcementIds } = req.body;

        if (!action || !announcementIds || !Array.isArray(announcementIds)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request. Action and announcement IDs are required.'
            });
        }

        // Verify user has permission for all announcements
        const announcements = await Announcement.find({ _id: { $in: announcementIds } });

        // Check if any announcements are expired and prevent bulk operations on them
        const expiredAnnouncements = announcements.filter(a => a.status === 'expired');
        if (expiredAnnouncements.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot perform bulk operations on expired announcements'
            });
        }

        for (let announcement of announcements) {
            const isOwner = announcement.teacherId.toString() === req.user._id.toString();
            const isAdmin = req.user.role === 'admin';

            // Check if current user is a teacher of the class
            const classData = await Class.findById(announcement.classId);
            const isClassTeacher = isTeacherOfClass(classData, req.user._id);

            if (!isOwner && !isAdmin && !isClassTeacher) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied for one or more announcements'
                });
            }
        }

        let updateData = { updatedAt: new Date() };
        let message = '';

        switch (action) {
            case 'activate':
                updateData.status = 'active';
                message = 'Announcements activated successfully';
                break;
            case 'deactivate':
                updateData.status = 'inactive';
                message = 'Announcements deactivated successfully';
                break;
            case 'delete':
                // Handle file deletion for bulk delete
                for (let announcement of announcements) {
                    if (announcement.attachments && announcement.attachments.length > 0) {
                        announcement.attachments.forEach(attachment => {
                            const filePath = path.join(__dirname, '..', 'uploads', 'announcements', attachment.filename);
                            fs.unlink(filePath, (err) => {
                                if (err) console.error('Error deleting file:', err);
                            });
                        });
                    }
                }

                await Announcement.deleteMany({ _id: { $in: announcementIds } });

                return res.json({
                    success: true,
                    message: 'Announcements deleted successfully'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action'
                });
        }

        await Announcement.updateMany(
            { _id: { $in: announcementIds } },
            updateData
        );

        res.json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Error performing bulk action:', error);
        res.status(500).json({
            success: false,
            message: 'Error performing bulk action',
            error: error.message
        });
    }
});

// Get classes where the current user is a teacher (helper endpoint)
router.get('/my-classes', auth, checkRole(['teacher']), async (req, res) => {
    try {
        const classes = await Class.find({
            $or: [
                { teachers: req.user._id },
                { teacher: req.user._id } // fallback for single teacher field
            ]
        }).select('name subject students');

        res.json({
            success: true,
            data: classes
        });
    } catch (error) {
        console.error('Error fetching teacher classes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching classes',
            error: error.message
        });
    }
});

// Manual trigger to check expired announcements (optional endpoint)
router.patch('/check-expired', auth, checkRole(['admin', 'teacher']), async (req, res) => {
    try {
        const result = await Announcement.updateMany(
            {
                expiryDate: { $lt: new Date() },
                status: { $ne: 'expired' }
            },
            {
                status: 'expired',
                updatedAt: new Date()
            }
        );

        res.json({
            success: true,
            message: `Checked for expired announcements. Updated ${result.modifiedCount} announcements.`,
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error checking expired announcements:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking expired announcements',
            error: error.message
        });
    }
});

module.exports = router;
