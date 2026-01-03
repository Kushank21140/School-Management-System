const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');

const initializeDB = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/SCHOOL_MANAGEMENT_NEW', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Clear existing data
    await User.deleteMany({});
    await Class.deleteMany({});

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@school.com',
      password: 'admin123',
      role: 'admin'
    });

    // Create teacher user
    const teacher = await User.create({
      name: 'Teacher User',
      email: 'teacher@school.com',
      password: 'teacher123',
      role: 'teacher'
    });

    // Create student users
    const students = await User.create([
      {
        name: 'Student 1',
        email: 'student1@school.com',
        password: 'student123',
        role: 'student'
      },
      {
        name: 'Student 2',
        email: 'student2@school.com',
        password: 'student123',
        role: 'student'
      }
    ]);

    // Create a class
    const class1 = await Class.create({
      name: 'Mathematics 101',
      teacher: teacher._id,
      students: students.map(student => student._id),
      startTime: '09:00', 
      endTime: '10:30',
      assignments: [
        {
          title: 'Algebra Basics',
          description: 'Complete exercises 1-10',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      ],
      announcements: [
        {
          message: 'Welcome to Mathematics 101!'
        }
      ]
    });



    console.log('Database initialized with test data');
    console.log('Admin credentials:', { email: 'admin@school.com', password: 'admin123' });
    console.log('Teacher credentials:', { email: 'teacher@school.com', password: 'teacher123' });
    console.log('Student credentials:', { email: 'student1@school.com', password: 'student123' });

    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDB(); 