const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

const cookieOptions = {
    httpOnly: true,
    secure: true,          // Set to true in production (HTTPS)
    sameSite: 'Strict',    // Or 'Lax' if cross-origin
  };



  exports.create = async (req, res) => {
    const { username, password, confirmPassword,creatorId } = req.body;
  
    try {
      if (!username || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required' });
      }
  
      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }
  
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = new User({
        username,
        password: hashedPassword,
        role: 'staff', // fixed role
        creatorId:creatorId,
        status: 1
      });
  
      await user.save();
  
      res.status(201).json({
        message: 'Worker created successful',
       data:user
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  exports.updateWorker = async (req, res) => {
    const { id } = req.params;
    const { username, password, confirmPassword } = req.body;
  
    try {
      const user = await User.findById(id);
  
      if (!user || user.role !== 'staff') {
        return res.status(404).json({ error: 'Worker not found' });
      }
  
      if (username) {
        // Check if username is already used by someone else
        const existingUser = await User.findOne({ username, _id: { $ne: id } });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        user.username = username;
      }
  
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          return res.status(400).json({ error: 'Passwords do not match' });
        }
        user.password = await bcrypt.hash(password, 10);
      }
  
      // Ensure role remains 'staff'
      user.role = 'staff';
  
      await user.save();
  
      res.status(200).json({
        message: 'Worker updated successfully',
        data: user
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  exports.getWorkerById = async (req, res) => {
    const { id } = req.params;
  
    try {
      const user = await User.findById(id).select('-password'); // exclude password
  
      if (!user || user.role !== 'staff') {
        return res.status(404).json({ error: 'Worker not found' });
      }
  
      res.status(200).json({
        message: 'Worker fetched successfully',
        data: user
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  exports.getAllWorkers = async (req, res) => {
    try {
      const { creatorId } = req.params;
  
      if (!creatorId) {
        return res.status(400).json({ error: 'creatorId is required' });
      }
  
      const workers = await User.find({ role: 'staff', creatorId }).select('-password');
  
      res.status(200).json({
        message: 'Workers fetched successfully',
        data: workers
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  exports.changePassword = async (req, res) => {
    try {
      const { id } = req.params;
      const { password, confirmPassword } = req.body;
  
      if (!password || !confirmPassword) {
        return res.status(400).json({ error: 'Password and confirm password are required' });
      }
  
      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }
  
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Partner not found' });
      }
  
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
  
      await user.save();
  
      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  exports.delete = async (req, res) => {
    const { id } = req.params;
  
    try {
      const user = await User.findById(id);
  
      if (!user || user.role !== 'staff') {
        return res.status(404).json({ error: 'Worker not found' });
      }
  
      await User.findByIdAndDelete(id);
  
      res.status(200).json({ message: 'Worker deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  
  

