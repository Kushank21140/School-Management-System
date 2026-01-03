const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const { checkRole, auth } = require('../middleware/auth');

router.get('/get-users', auth, checkRole('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'student', 'teacher'] } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching users'
    });
  }
});

router.get('/get-teachers', auth, checkRole('admin'), async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: teachers,
      count: teachers.length
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching users'
    });
  }
});

router.get('/get-students', auth, checkRole('admin'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching users'
    });
  }
});

// Get single admin by ID
router.get('/admins/:id', auth, checkRole(['admin']), async (req, res) => {
  try {
    const admin = await User.findById(req.params.id)
      .select('-password');

    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({
        success: false,
        error: 'Admin user not found'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching admin user'
    });
  }
});

// Create new user
router.post('/add-user', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    let newuser;
    if (role === 'student') {
      const { parentName, parentEmail, parentMobile } = req.body;
      newuser = new User({
        name,
        email,
        password,
        role: role,
        parentName,
        parentEmail,
        parentMobile
      });
    } else if (role === 'teacher' || role === 'admin') {
      newuser = new User({
        name,
        email,
        password,
        role: role
      });
    }

    await newuser.save();

    const userResponse = newuser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating user'
    });
  }
});

router.get('/class/:name', auth, checkRole('admin'), async (req, res) => {
  try {

    const classdetails = await Class.find({ name: req.params.name })
      .populate('teachers', 'name email role') // Get teacher details
      .populate('students', 'name email parentName parentEmail parentMobile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: classdetails
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching classes'
    });
  }
});

// Create class route with comprehensive error handling
router.post('/create-class', auth, checkRole(['admin']), async (req, res) => {
  try {
    console.log('=== CREATE CLASS REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User making request:', req.user?.id);

    const { className, studentIds, teacherIds, subjects } = req.body;

    // Validate required fields
    if (!className || typeof className !== 'string' || !className.trim()) {
      console.log('❌ Validation failed: Invalid class name');
      return res.status(400).json({
        success: false,
        error: 'Class name is required and must be a valid string'
      });
    }

    const trimmedClassName = className.trim();
    console.log('✅ Class name validated:', trimmedClassName);

    // Check for existing class
    console.log('🔍 Checking for existing class...');
    const existingClass = await Class.findOne({ name: trimmedClassName });
    if (existingClass) {
      console.log('❌ Class already exists:', existingClass.name);
      return res.status(400).json({
        success: false,
        error: 'Class with this name already exists'
      });
    }
    console.log('✅ Class name is unique');

    // Validate teacher if provided
    let validatedTeacherId = [];
    if (teacherIds && Array.isArray(teacherIds) && teacherIds.length > 0) {
      console.log('🔍 Validating teachers:', teacherIds);
      console.log('🔍 Teacher IDs received:', JSON.stringify(teacherIds, null, 2));

      try {

        const teachers = await User.find({
          _id: { $in: teacherIds },
          role: 'teacher'
        });

        console.log('🔍 Teachers found in database:', teachers.length);
        console.log('🔍 Teacher details:', JSON.stringify(teachers.map(t => ({ id: t._id, name: t.name, role: t.role })), null, 2));

        if (teachers.length !== teacherIds.length) {
          console.log('❌ Teacher not found:', teachers.length, 'Expected:', teacherIds.length);
          return res.status(400).json({
            success: false,
            error: 'Some selected students are invalid or not found'
          });
        }

        validatedTeacherId = teachers.map(s => s._id);
        console.log('✅ Teacher validated:', teachers.length);
      } catch (teacherError) {
        console.log('❌ Error validating teacher:', teacherError.message);
        return res.status(400).json({
          success: false,
          error: 'Invalid teacher ID provided'
        });
      }
    } else {
      console.log('ℹ️ No teacher provided - creating class without teacher');
    }

    // Validate students if provided
    let validatedStudentIds = [];
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      console.log('🔍 Validating students:', studentIds.length, 'students');

      try {
        const students = await User.find({
          _id: { $in: studentIds },
          role: 'student'
        });

        if (students.length !== studentIds.length) {
          console.log('❌ Some students invalid. Found:', students.length, 'Expected:', studentIds.length);
          return res.status(400).json({
            success: false,
            error: 'Some selected students are invalid or not found'
          });
        }

        validatedStudentIds = students.map(s => s._id);
        console.log('✅ Students validated:', students.length, 'students');
      } catch (studentError) {
        console.log('❌ Error validating students:', studentError.message);
        return res.status(400).json({
          success: false,
          error: 'Invalid student IDs provided'
        });
      }
    } else {
      console.log('ℹ️ No students provided - creating class without students');
    }

    // Validate subjects
    let validatedSubjects = [];
    if (subjects && Array.isArray(subjects)) {
      validatedSubjects = subjects.filter(subject =>
        subject && typeof subject === 'string' && subject.trim()
      ).map(subject => subject.trim());
      console.log('✅ Subjects validated:', validatedSubjects.length, 'subjects');
    } else {
      console.log('ℹ️ No subjects provided - creating class without subjects');
    }

    // Create class object
    console.log('🏗️ Creating class object...');
    const classData = {
      name: trimmedClassName,
      subjects: validatedSubjects,
      students: validatedStudentIds
    };

    // Only add teacher if one is validated
    if (validatedTeacherId && validatedTeacherId.length > 0) {
      classData.teachers = validatedTeacherId;  // Use 'teachers' to match model

      console.log('📝 Adding teachers to class data:', JSON.stringify(validatedTeacherId, null, 2));
    }

    console.log('📝 Class data to save:', JSON.stringify(classData, null, 2));

    // Create and save the class
    const newClass = new Class(classData);
    console.log('💾 Saving class to database...');

    const savedClass = await newClass.save();
    console.log('✅ Class saved successfully with ID:', savedClass._id);

    // Populate the response
    console.log('🔄 Populating class data...');
    let populatedClass;

    if (validatedTeacherId.length > 0) {
      populatedClass = await Class.findById(savedClass._id)
        .populate('teachers', 'name email')  // Use 'teachers' not 'teacher'
        .populate('students', 'name email');
    } else {
      populatedClass = await Class.findById(savedClass._id)
        .populate('students', 'name email');
    }

    console.log('✅ Class populated successfully');
    console.log('=== CREATE CLASS REQUEST END ===');

    res.status(201).json({
      success: true,
      data: populatedClass,
      message: 'Class created successfully'
    });

  } catch (error) {
    console.error('=== CRITICAL ERROR IN CREATE CLASS ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      console.error('MongoDB Validation Error:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      console.error('MongoDB Error:', error.code, error.codeName);
      return res.status(500).json({
        success: false,
        error: 'Database error occurred'
      });
    }

    if (error.name === 'CastError') {
      console.error('MongoDB Cast Error:', error.path, error.value);
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format provided'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while creating class: ' + error.message
    });
  }
});

//remove teacher/students/subject from class
router.post('/remove-ts', auth, checkRole(['admin']), async (req, res) => {
  try {
    console.log('=== REMOVE FROM CLASS REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { className, type, ids } = req.body;

    // Validate required fields
    if (!className || !type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Class name, type, and IDs array are required'
      });
    }

    // Validate type
    const validTypes = ['teachers', 'students', 'subjects'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be one of: teachers, students, subjects'
      });
    }

    console.log(`✅ Removing ${ids.length} ${type} from class: ${className}`);

    // Find the class
    const existingClass = await Class.findOne({ name: className });
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    let updateData = {};

    if (type === 'subjects') {
      // For subjects, remove by value
      const currentSubjects = existingClass.subjects || [];
      const updatedSubjects = currentSubjects.filter(subject => !ids.includes(subject));
      updateData.subjects = updatedSubjects;
      console.log(`📝 Removing subjects: ${ids.join(', ')}`);
    } else {
      // For teachers and students, remove by ID
      const currentIds = existingClass[type]?.map(item => item.toString()) || [];
      const idsToRemove = ids.map(id => id.toString());
      const updatedIds = currentIds.filter(id => !idsToRemove.includes(id));
      updateData[type] = updatedIds;
      console.log(`📝 Removing ${type} IDs: ${idsToRemove.join(', ')}`);
    }

    // Update the class
    const updatedClass = await Class.findOneAndUpdate(
      { name: className },
      updateData,
      { new: true }
    ).populate('teachers', 'name email role')
     .populate('students', 'name email parentName parentEmail parentMobile');

    console.log('✅ Class updated successfully');
    console.log('=== REMOVE FROM CLASS REQUEST END ===');

    res.json({
      success: true,
      data: [updatedClass],
      message: `${type} removed successfully`
    });

  } catch (error) {
    console.error('=== ERROR IN REMOVE FROM CLASS ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Server error while removing from class: ' + error.message
    });
  }
});

//add teacher/students/subject to class
router.post('/add-ts', auth, checkRole(['admin']), async (req, res) => {
  try {
    console.log('=== ADD TO CLASS REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { className, type, ids } = req.body;

    // Validate required fields
    if (!className || !type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Class name, type, and IDs array are required'
      });
    }

    // Validate type
    const validTypes = ['teachers', 'students', 'subjects'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be one of: teachers, students, subjects'
      });
    }

    console.log(`✅ Adding ${ids.length} ${type} to class: ${className}`);

    // Find the class
    const existingClass = await Class.findOne({ name: className });
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    let updateData = {};

    if (type === 'subjects') {
      // For subjects, add by value (avoid duplicates)
      const currentSubjects = existingClass.subjects || [];
      const newSubjects = ids.filter(subject => 
        typeof subject === 'string' && 
        subject.trim() && 
        !currentSubjects.includes(subject.trim())
      ).map(subject => subject.trim());
      
      updateData.subjects = [...currentSubjects, ...newSubjects];
      console.log(`📝 Adding subjects: ${newSubjects.join(', ')}`);
    } else {
      // For teachers and students, validate they exist and have correct role
      const roleToCheck = type === 'teachers' ? 'teacher' : 'student';
      
      console.log(`🔍 Validating ${type} with role: ${roleToCheck}`);
      const users = await User.find({
        _id: { $in: ids },
        role: roleToCheck
      });

      if (users.length !== ids.length) {
        console.log(`❌ Some ${type} invalid. Found: ${users.length}, Expected: ${ids.length}`);
        return res.status(400).json({
          success: false,
          error: `Some selected ${type} are invalid or not found`
        });
      }

      // Add to existing (avoid duplicates)
      const currentIds = existingClass[type]?.map(item => item.toString()) || [];
      const newIds = ids.filter(id => !currentIds.includes(id.toString()));
      updateData[type] = [...currentIds, ...newIds];
      
      console.log(`📝 Adding ${type} IDs: ${newIds.join(', ')}`);
    }

    // Update the class
    const updatedClass = await Class.findOneAndUpdate(
      { name: className },
      updateData,
      { new: true }
    ).populate('teachers', 'name email role')
     .populate('students', 'name email parentName parentEmail parentMobile');

    console.log('✅ Class updated successfully');
    console.log('=== ADD TO CLASS REQUEST END ===');

    res.json({
      success: true,
      data: [updatedClass],
      message: `${type} added successfully`
    });

  } catch (error) {
    console.error('=== ERROR IN ADD TO CLASS ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format provided'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while adding to class: ' + error.message
    });
  }
});




module.exports = router;
