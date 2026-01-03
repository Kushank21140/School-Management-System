const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const  { checkRole, auth }  = require('../middleware/auth');

// Get class by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const classDoc = await Class.findById(id)
            .populate('teacher', 'name email')
            .populate('students', 'name email');
            
        if (!classDoc) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Check if user has access to this class
        const isTeacher = classDoc.teacher._id.toString() === req.user.id;
        const isStudent = classDoc.students.some(student => student._id.toString() === req.user.id);
        
        if (!isTeacher && !isStudent && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this class'
            });
        }

        res.json({
            success: true,
            data: classDoc
        });
    } catch (error) {
        console.error('Error fetching class:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching class information',
            error: error.message
        });
    }
});

module.exports = router;
