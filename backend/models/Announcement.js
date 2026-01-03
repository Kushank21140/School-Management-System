const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['normal', 'medium', 'high'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attachments: [{
        originalName: String,
        filename: String,
        url: String,
        size: Number,
        mimetype: String
    }],
    expiryDate: {
        type: Date
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Index for better query performance
announcementSchema.index({ classId: 1, createdAt: -1 });
announcementSchema.index({ teacherId: 1, createdAt: -1 });
announcementSchema.index({ status: 1, expiryDate: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
