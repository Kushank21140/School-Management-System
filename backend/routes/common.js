const express = require('express');
const router = express.Router();
const { checkRole, auth } = require('../middleware/auth');
const User = require('../models/User');
const Class = require('../models/Class');

router.get('/classes', auth, async (req, res) => {
    try {

        if (req.user.role == 'admin') {

            const classes = await Class.find()
                .select('name createdAt')
                .sort({ createdAt: -1 });

            return res.json({
                success: true,
                data: classes,
                count: classes.length
            });
        } else if (req.user.role == 'teacher') {

            const classes = await Class.find({ teachers: req.user._id })
                .select('name createdAt students')
                .sort({ createdAt: -1 });

            return res.json({
                success: true,
                data: classes,
                count: classes.length
            });
        } else if (req.user.role == 'student') {

            const classes = await Class.find({ students: req.user._id })
                .select('name createdAt')
                .sort({ createdAt: -1 });

            return res.json({
                success: true,
                data: classes,
                count: classes.length
            });

        }

    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching classes'
        });
    }
});

module.exports = router;
