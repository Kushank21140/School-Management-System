import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  MenuList,
  Popper,
  Paper,
  ClickAwayListener
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Dashboard,
  School,
  Person,
  Class,
  Assignment,
  Grade,
  AdminPanelSettings,
  ArrowDropDown,
  Groups,
  PersonAdd,
  Key,
  Home
} from '@mui/icons-material';
import { logout } from '../../redux/slices/authSlice';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [usersMenuOpen, setUsersMenuOpen] = React.useState(false);
  const [usersAnchorEl, setUsersAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleChangePassword = () => {
    navigate('/change-password');
    handleClose();
  };

  // Handle Users dropdown
  const handleUsersMouseEnter = (event) => {
    setUsersAnchorEl(event.currentTarget);
    setUsersMenuOpen(true);
  };

  const handleUsersMouseLeave = () => {
    setUsersMenuOpen(false);
  };

  const handleUsersClickAway = () => {
    setUsersMenuOpen(false);
  };

  // Define navigation items based on roles
  const getNavigationItems = () => {
    if (!user) return [];

    const role = user.role?.toLowerCase();

    switch (role) {
      case 'admin':
        return [
          { label: 'Home', path: '/admin/dashboard', icon: <Home /> },
          // { label: 'Users', path: '/admin/users-list', icon: <Person /> },
          // { label: 'Schools', path: '/admin/schools', icon: <School /> },
          // { label: 'Classes', path: '/admin/classes', icon: <Class /> },
          // { label: 'Reports', path: '/admin/reports', icon: <Assignment /> }
        ];

      case 'teacher':
        return [
          { label: 'Home', path: '/teacher/dashboard', icon: <Home /> },
          // { label: 'My Classes', path: '/teacher/classes', icon: <Class /> },
          // { label: 'Students', path: '/teacher/students', icon: <Person /> },
          // { label: 'Assignments', path: '/teacher/assignments', icon: <Assignment /> },
          // { label: 'Grades', path: '/teacher/grades', icon: <Grade /> }
        ];

      case 'student':
        return [
          { label: 'Home', path: '/student/dashboard', icon: <Home /> },
          // { label: 'My Classes', path: '/student/classes', icon: <Class /> },
          // { label: 'Assignments', path: '/student/assignments', icon: <Assignment /> },
          // { label: 'Grades', path: '/student/grades', icon: <Grade /> }
        ];

      default:
        return [
          { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> }
        ];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <AppBar position="static">
      <Toolbar>
        {/* App Title */}
        <Typography variant="h6" component="div" sx={{ mr: 4 }}>
          School Management System
        </Typography>

        {user && (
          <>
            {/* Navigation Buttons - Desktop */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
              {navigationItems.map((item) => (
                <Box key={item.path} sx={{ position: 'relative' }}>
                  {item.hasDropdown ? (
                    <ClickAwayListener onClickAway={handleUsersClickAway}>
                      <Box>
                        <Button
                          color="inherit"
                          startIcon={item.icon}
                          endIcon={<ArrowDropDown />}
                          onClick={() => handleNavigation(item.path)}
                          onMouseEnter={handleUsersMouseEnter}
                          sx={{ ml: 1 }}
                        >
                          {item.label}
                        </Button>
                        <Popper
                          open={usersMenuOpen}
                          anchorEl={usersAnchorEl}
                          placement="bottom-start"
                          sx={{ zIndex: 1300 }}
                        >
                          <Paper
                            onMouseEnter={() => setUsersMenuOpen(true)}
                            onMouseLeave={handleUsersMouseLeave}
                            sx={{ mt: 1 }}
                          >
                            <MenuList>
                              {item.dropdownItems?.map((dropdownItem) => (
                                <MenuItem
                                  key={dropdownItem.path}
                                  onClick={() => {
                                    handleNavigation(dropdownItem.path);
                                    setUsersMenuOpen(false);
                                  }}
                                  sx={{ minWidth: 150 }}
                                >
                                  {dropdownItem.icon}
                                  <Typography sx={{ ml: 1 }}>
                                    {dropdownItem.label}
                                  </Typography>
                                </MenuItem>
                              ))}
                            </MenuList>
                          </Paper>
                        </Popper>
                      </Box>
                    </ClickAwayListener>
                  ) : (
                    <Button
                      color="inherit"
                      startIcon={item.icon}
                      onClick={() => handleNavigation(item.path)}
                      sx={{ ml: 1 }}
                    >
                      {item.label}
                    </Button>
                  )}
                </Box>
              ))}
            </Box>

            {/* Spacer for mobile - pushes user info to right */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, flexGrow: 1 }} />

            {/* User Menu - Always on the right */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                {user.name} ({user.role})
              </Typography>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                {/* Mobile Navigation Items */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  {navigationItems.map((item) => (
                    <Box key={item.path}>
                      <MenuItem
                        onClick={() => {
                          handleNavigation(item.path);
                          handleClose();
                        }}
                      >
                        {item.icon}
                        <Typography sx={{ ml: 1 }}>{item.label}</Typography>
                      </MenuItem>
                      {/* Show dropdown items in mobile menu */}
                      {item.hasDropdown && item.dropdownItems?.map((dropdownItem) => (
                        <MenuItem
                          key={dropdownItem.path}
                          onClick={() => {
                            handleNavigation(dropdownItem.path);
                            handleClose();
                          }}
                          sx={{ pl: 4 }}
                        >
                          {dropdownItem.icon}
                          <Typography sx={{ ml: 1 }}>{dropdownItem.label}</Typography>
                        </MenuItem>
                      ))}
                    </Box>
                  ))}
                  <hr />
                </Box>

                {/* Show user info in mobile menu */}
                <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                  <MenuItem disabled>
                    <Person sx={{ mr: 1 }} />
                    <Typography>{user.name} ({user.role})</Typography>
                  </MenuItem>
                  <hr />
                </Box>

                <MenuItem onClick={handleChangePassword}>
                  <Key sx={{ mr: 1 }} /> Change Password
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout sx={{ mr: 1 }} /> Logout
                </MenuItem>
              </Menu>
            </Box>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
