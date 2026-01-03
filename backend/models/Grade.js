const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'],
    required: true
  },
  feedback: {
    type: String,
    trim: true
  },
  gradedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one grade per student per assessment
gradeSchema.index({ assessment: 1, student: 1 }, { unique: true });
gradeSchema.index({ class: 1, assessment: 1 });

// Method to calculate letter grade
gradeSchema.methods.calculateLetterGrade = function() {
  const percentage = this.percentage;
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 60) return 'D';
  return 'F';
};

// Pre-save middleware to calculate percentage and letter grade
gradeSchema.pre('save', function(next) {
  this.percentage = Math.round((this.score / this.totalMarks) * 100 * 10) / 10;
  this.letterGrade = this.calculateLetterGrade();
  next();
});

module.exports = mongoose.model('Grade', gradeSchema);
