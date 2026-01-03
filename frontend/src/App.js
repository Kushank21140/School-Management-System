import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import { AuthProvider } from './contexts/AuthContext';
import AddUser from './components/admin/Users/Add-user';
import CreateClass from './components/admin/Class/Create-class';
import Classhome from './components/admin/Class/class-home';
import ClassHome from './components/teacher/Classes/Class-home';
import TeacherList from './components/teacher/Classes/Teacher-List/Teacher-list';
import StudentList from './components/teacher/Classes/Student-List/Student-list';
import Resources from './components/teacher/Classes/Resources/Resources';
import Announcement from './components/teacher/Classes/Announcement/Announcement';
import StudentClassHome from './components/student/Student-Class/Student-Class-home';
import Assignments from './components/teacher/Classes/Assignments/Assignments';
import TimeTable from './components/teacher/Classes/Time-Table/TimeTable';
import Attendance from './components/teacher/Classes/Attendance/Attendance';
import ChangePassword from './components/common/ChangePassword';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute roles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            <Route path='/admin/add-user' element={<AddUser />} />
            
            <Route path='/admin/create-class' element={<CreateClass />} />
            <Route path='/admin/class/:className' element={<Classhome />} />

            {/* Teacher Routes */}
            <Route
              path="/teacher/dashboard"
              element={
                <PrivateRoute roles={['teacher']}>
                  <TeacherDashboard />
                </PrivateRoute>
              }
            />

            <Route path='/teacher/class/:className' element={<ClassHome />} />
            <Route path='/teacher/class/:className/teachers' element={<TeacherList />} />
            <Route path='/teacher/class/:className/students' element={<StudentList />} />
            <Route path='/teacher/class/:className/Resources' element={<Resources />} />
            <Route path='/teacher/class/:className/announcements' element={<Announcement />} />
            <Route path='/teacher/class/:className/assignments' element={<Assignments />} />
            <Route path='/teacher/class/:className/timetable' element={<TimeTable />} />
            <Route path='/teacher/class/:className/attendance' element={<Attendance />} />

            {/* Student Routes */}
            <Route
              path="/student/dashboard"
              element={
                <PrivateRoute roles={['student']}>
                  <StudentDashboard />
                </PrivateRoute>
              }
            />

            <Route path='/student/class/:className' element={<StudentClassHome />} />

            {/* Common Routes */}

            <Route path="/" element={<Navigate to="/login" />} />

            <Route path="/change-password" element={<ChangePassword/>} />
            
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
