const mongoose = require('mongoose');

// Drop the collection and recreate it to ensure clean schema
const dropCollection = async () => {
  try {
    await mongoose.connection.db.collection('timetables').drop();
    console.log('Timetables collection dropped successfully');
  } catch (error) {
    if (error.code === 26) {
      console.log('Timetables collection does not exist, continuing...');
    } else {
      console.log('Error dropping collection:', error.message);
    }
  }
};

const timetableSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  room: {
    type: String,
    required: [true, 'Room is required'],
    trim: true,
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },
  day: {
    type: String,
    required: [true, 'Day is required'],
    trim: true,
    enum: {
      values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      message: 'Day must be a valid day of the week'
    }
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Validate time format like "09:00 - 10:30"
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in format "HH:MM - HH:MM"'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  collection: 'timetables' // Explicitly set collection name
});

// Create indexes after ensuring clean schema
timetableSchema.index({ teacher: 1, isActive: 1 }, { name: 'teacher_active_idx' });
timetableSchema.index({ class: 1, isActive: 1 }, { name: 'class_active_idx' });

// Unique compound index for class, day, time (only for active entries)
timetableSchema.index(
  { class: 1, day: 1, time: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'unique_class_day_time_idx'
  }
);

// Virtual for formatted display
timetableSchema.virtual('displayName').get(function() {
  return `${this.subject} - ${this.room}`;
});

// Pre-save middleware to validate teacher access to class
timetableSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('class') || this.isModified('teacher')) {
    try {
      const Class = mongoose.model('Class');
      const classDoc = await Class.findOne({
        _id: this.class,
        $or: [
          { teacher: this.teacher },
          { teachers: this.teacher }
        ]
      });
      
      if (!classDoc) {
        const error = new Error('Teacher does not have access to this class');
        error.name = 'ValidationError';
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get timetable for a teacher
timetableSchema.statics.getTeacherTimetable = function(teacherId, classId = null) {
  const query = { 
    teacher: teacherId, 
    isActive: true 
  };
  
  if (classId) {
    query.class = classId;
  }
  
  return this.find(query)
    .populate('teacher', 'name email')
    .populate('class', 'name')
    .sort({ day: 1, time: 1 });
};

// Static method to check for conflicts
timetableSchema.statics.checkConflict = function(classId, day, time, excludeId = null) {
  const query = {
    class: classId,
    day: day,
    time: time,
    isActive: true
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.findOne(query);
};

// Static method to get class schedule
timetableSchema.statics.getClassSchedule = function(classId) {
  return this.find({
    class: classId,
    isActive: true
  })
  .populate('teacher', 'name')
  .sort({ day: 1, time: 1 });
};

// Instance method to check conflicts
timetableSchema.methods.hasConflict = async function() {
  const conflict = await this.constructor.findOne({
    _id: { $ne: this._id },
    class: this.class,
    day: this.day,
    time: this.time,
    isActive: true
  });
  return !!conflict;
};

// Initialize the model
const Timetable = mongoose.model('Timetable', timetableSchema);

// Drop and recreate collection on first load (only in development)
if (process.env.NODE_ENV !== 'production') {
  dropCollection();
}

module.exports = Timetable;
