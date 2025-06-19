const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

const cookieOptions = {
    httpOnly: true,
    secure: true,          // Set to true in production (HTTPS)
    sameSite: 'Strict',    // Or 'Lax' if cross-origin
  };

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
    res.status(500).json({ error: 'Internal Server Error' });
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

    // Generate tokens
    const accessToken = generateAccessToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });


    res.status(200).json({
      message: "Login successful",
      username: user.username,
      _id: user._id,
      role: user.role,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};




// Refresh Access Token
exports.refreshToken = (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token, please login' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const accessToken = generateAccessToken({ id: decoded.id, mobile: decoded.mobile });
      res.cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRES) * 60 * 1000 || 15 * 60 * 1000 // 15 mins
      });
      res.json({ accessToken });
    } catch (error) {
      console.error(error);
      return res.status(403).json({ message: 'Invalid refresh token' });
    }
  };
  
  // Logout
  exports.logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    res.status(200).json({ message: 'Logged out successfully' });
    
  };