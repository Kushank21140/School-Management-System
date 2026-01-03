const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Class name is required'],
        trim: true,
        unique: true,
        minlength: [1, 'Class name cannot be empty'],
        maxlength: [100, 'Class name cannot exceed 100 characters']
    },
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: function(v) {
                // If teacher is provided, it should be a valid ObjectId
                return mongoose.Types.ObjectId.isValid(v);
            },
            message: 'Each Teachers must be a valid user ID'
        }
    }],
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        validate: {
            validator: function(v) {
                return mongoose.Types.ObjectId.isValid(v);
            },
            message: 'Each student must be a valid user ID'
        }
    }],
    subjects: [{
        type: String,
        trim: true,
        minlength: [1, 'Subject name cannot be empty'],
        maxlength: [50, 'Subject name cannot exceed 50 characters']
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for better performance
classSchema.index({ name: 1 });
classSchema.index({ teacher: 1 });

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
