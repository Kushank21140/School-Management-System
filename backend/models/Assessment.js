const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Quiz', 'Assignment', 'Midterm', 'Mid 2', 'Final', 'Project', 'Presentation', 'Lab Test'],
    default: 'Quiz'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1,
    max: 1000,
    default: 100
  },
  date: {
    type: Date,
    required: true
  },
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
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  gradedCount: {
    type: Number,
    default: 0
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  instructions: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
assessmentSchema.index({ class: 1, teacher: 1 });
assessmentSchema.index({ date: -1 });
assessmentSchema.index({ subject: 1 });

// Validate subject against class subjects before saving
assessmentSchema.pre('save', async function(next) {
  if (this.isModified('subject') || this.isModified('class')) {
    try {
      const Class = mongoose.model('Class');
      const classDoc = await Class.findById(this.class);
      
      if (classDoc && classDoc.subjects && classDoc.subjects.length > 0) {
        if (!classDoc.subjects.includes(this.subject)) {
          throw new Error(`Subject "${this.subject}" is not available in this class. Available subjects: ${classDoc.subjects.join(', ')}`);
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Assessment', assessmentSchema);
