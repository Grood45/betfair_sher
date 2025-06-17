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

// Register User
exports.registerUser = async (req, res) => {
  const { name, mobile, password } = req.body;
  try {
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.render('register', { error: 'Mobile already registered!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, mobile, password: hashedPassword });
    await newUser.save();
    
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.render('register', { error: 'Something went wrong. Try again!' });
  }
};

// Render Login Page
exports.loginPage = (req, res) => {
  res.render('auth/login');
};

// Login User
exports.loginUser = async (req, res) => {
  const { mobile, password } = req.body;
  try {
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.render('auth/login', { error: 'Invalid mobile' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('auth/login', { error: 'Invalid password!' });
    }
    
    const accessToken = generateAccessToken({ id: user._id, mobile: mobile });   
    const refreshToken = generateRefreshToken({ id: user._id, mobile: mobile });
   
    res.cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRES) * 60 * 1000 || 15 * 60 * 1000 // 15 mins
    });

    res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES) * 24 * 60 * 60 * 1000 || 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.redirect('/dashboard');
    //res.render('dashboard', { user, accessToken });
  } catch (error) {
    console.error(error);
    res.render('auth/login', { error: 'Something went wrong. Try again!' });
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
    res.redirect('/login');
  };