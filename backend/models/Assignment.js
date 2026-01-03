const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: ''
  },
  dueDate: {
    type: Date,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1,
    default: 100
  },
  attachments: [{
    name: String,
    url: String,
    size: Number
  }],
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Legacy fields for backward compatibility
  subject: {
    type: String
  },
  file: {
    data: Buffer,
    contentType: String,
    filename: String
  }
}, {
  timestamps: true
});

// Index for better query performance
assignmentSchema.index({ class: 1, createdAt: -1 });
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ dueDate: 1 });

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Virtual for days remaining
assignmentSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Assignment', assignmentSchema);
