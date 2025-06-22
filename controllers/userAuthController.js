const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const LoginHistory = require('../models/loginHistory');
// Render Register Page
exports.registerPage = (req, res) => {
  res.render('auth/register');
};

// Register / Signup API
exports.signUp = async (req, res) => {
  const { username, password, name, mobile, role } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      name: name || null,
      mobile: mobile || null,
      role: role || 'user',
      status: 1
    });

    await user.save();

    const accessToken = generateAccessToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    res.status(201).json({
      message: 'Signup successful',
      username: user.username,
      role: user.role,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error','msg':error.message });
  }
};


// Render Login Page
exports.loginPage = (req, res) => {
  res.render('auth/login');
};

// controllers/userAuthController.js

exports.loginUser = async (req, res) => {
  const { login, password } = req.body; // `login` can be username OR mobile

  try {
    // Try to find user by username or mobile
    const user = await User.findOne({
      $or: [
        { username: login },
        { mobile: login }
      ]
    });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }


    const payload = {
      id: user._id,
      role: user.role,
      username: user.username
    };
    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save login history (first login)
    const ipAddress = req.ip || req.connection.remoteAddress;
    const browser = req.headers['user-agent'];

   const history = await LoginHistory.create({
      userId: user._id,
      ipAddress,
      browser
    });

    res.status(200).json({
      message: "Login successful",
      username: user.username,
      _id: user._id,
      role: user.role,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};




// Refresh Access Token using refresh token sent in the body
exports.refreshToken = (req, res) => {
  const { refreshToken } = req.body; // Use body, not cookie

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generate new access token
    const accessToken = generateAccessToken({
      id: decoded.id,
    });

    // Return new access token in response
    res.status(200).json({ accessToken });

  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

  
  // Logout
  exports.logout = async (req, res) => {
    const userId = req.user.id;
    
    const latestLogin = await LoginHistory.findOne({ userId: userId }).sort({ loginDate: -1 });

    if (latestLogin) {
      latestLogin.logoutDate = new Date();
      await latestLogin.save();
    }

    res.status(200).json({ message: 'Logged out successfully' });
    
  };

  exports.getLoginHistory = async (req, res) => {
    try {
      const userId = req.userId;

  
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
  
      const history = await LoginHistory.find({ userId }).sort({ loginDate: -1 });
  
      res.status(200).json({
        message: 'Login history fetched successfully',
        data: history
      });
    } catch (error) {
      console.error('Error fetching login history:', error);
      res.status(500).json({ error: 'Internal Server Error','msg':error.message });
    }
  };

// Controller to create a new role with menu permissions
exports.createRole = async (req, res) => {
  try {
    const { staffId, roleName, menus } = req.body;

    // Validate input
    if (!staffId || !roleName || !Array.isArray(menus)) {
      return res.status(400).json({ message: 'staffId, roleName, and menus[] are required' });
    }

    // Ensure only superadmin can assign roles
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can assign roles' });
    }

    // Find staff user
    const user = await User.findById(staffId);
    if (!user) {
      return res.status(404).json({ message: 'Staff user not found' });
    }

    // Assign new role and custom menu permissions
    user.role = roleName;
    user.customMenus = menus;
    if (!user.creatorId) {
      user.creatorId = req.user.id;
    }
    await user.save();

    return res.status(200).json({
      message: 'Role and menus assigned to staff',
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        customMenus: user.customMenus
      }
    });

  } catch (err) {
    console.error('Assign role error:', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err.message
    });
  }
};

