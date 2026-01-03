const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  files: [{
    name: String,
    url: String,
    size: Number
  }],
  comments: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  marks: {
    type: Number,
    min: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  isGraded: {
    type: Boolean,
    default: false
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index to ensure one submission per student per assignment
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Index for better query performance
submissionSchema.index({ assignment: 1, submittedAt: -1 });
submissionSchema.index({ student: 1 });
submissionSchema.index({ isGraded: 1 });

// Pre-save middleware to check if submission is late
submissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const assignment = await mongoose.model('Assignment').findById(this.assignment);
    if (assignment && new Date() > assignment.dueDate) {
      this.isLate = true;
    }
  }
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);
