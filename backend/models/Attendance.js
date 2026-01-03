const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'absent'
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 200
  }
});

const attendanceSchema = new mongoose.Schema({
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
  subject: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  timeSlot: {
    type: String,
    required: true,
    trim: true
  },
  room: {
    type: String,
    trim: true
  },
  timetableEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable'
  },
  records: [attendanceRecordSchema],
  totalStudents: {
    type: Number,
    default: 0
  },
  presentCount: {
    type: Number,
    default: 0
  },
  absentCount: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for better performance
attendanceSchema.index({ class: 1, date: -1 });
attendanceSchema.index({ teacher: 1, date: -1 });
attendanceSchema.index({ class: 1, teacher: 1, date: -1 });
attendanceSchema.index({ 'records.student': 1 });

// Pre-save middleware to calculate statistics
attendanceSchema.pre('save', function(next) {
  if (this.records && this.records.length > 0) {
    this.totalStudents = this.records.length;
    this.presentCount = this.records.filter(r => r.status === 'present').length;
    this.absentCount = this.records.filter(r => r.status === 'absent').length;
    this.lateCount = this.records.filter(r => r.status === 'late').length;
    
    // Calculate attendance percentage (present + late considered as attended)
    const attendedCount = this.presentCount + this.lateCount;
    this.attendancePercentage = this.totalStudents > 0 
      ? Math.round((attendedCount / this.totalStudents) * 100) 
      : 0;
  }
  
  // Set completion timestamp
  if (this.isCompleted && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Static method to get attendance summary for a class
attendanceSchema.statics.getClassSummary = function(classId, startDate, endDate) {
  const matchQuery = { class: classId };
  
  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate);
    if (endDate) matchQuery.date.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        averageAttendance: { $avg: '$attendancePercentage' },
        totalPresent: { $sum: '$presentCount' },
        totalAbsent: { $sum: '$absentCount' },
        totalLate: { $sum: '$lateCount' },
        completedSessions: { $sum: { $cond: ['$isCompleted', 1, 0] } }
      }
    }
  ]);
};

// Static method to get student attendance summary
attendanceSchema.statics.getStudentSummary = function(studentId, classId, startDate, endDate) {
  const matchQuery = {
    class: classId,
    'records.student': studentId
  };
  
  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate);
    if (endDate) matchQuery.date.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchQuery },
    { $unwind: '$records' },
    { $match: { 'records.student': studentId } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        presentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: [{ $add: ['$presentCount', '$lateCount'] }, '$totalSessions'] },
                100
              ]
            },
            2
          ]
        }
      }
    }
  ]);
};

// Instance method to mark student attendance
attendanceSchema.methods.markStudent = function(studentId, status, notes = '') {
  const existingRecord = this.records.find(r => r.student.toString() === studentId.toString());
  
  if (existingRecord) {
    existingRecord.status = status;
    existingRecord.markedAt = new Date();
    existingRecord.notes = notes;
  } else {
    this.records.push({
      student: studentId,
      status: status,
      markedAt: new Date(),
      notes: notes
    });
  }
  
  return this.save();
};

// Instance method to get attendance statistics
attendanceSchema.methods.getStats = function() {
  return {
    totalStudents: this.totalStudents,
    presentCount: this.presentCount,
    absentCount: this.absentCount,
    lateCount: this.lateCount,
    attendancePercentage: this.attendancePercentage,
    isCompleted: this.isCompleted
  };
};

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

// Virtual for attendance status
attendanceSchema.virtual('status').get(function() {
  if (this.isCompleted) return 'completed';
  if (this.records.length > 0) return 'in-progress';
  return 'not-started';
});

module.exports = mongoose.model('Attendance', attendanceSchema);
