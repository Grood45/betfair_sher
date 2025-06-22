const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const scoreAPI = require('../models/scoreAPI');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

// ✅ Create a new Score API
exports.create = async (req, res) => {
    try {
      const { apiName, category, codeType, apiUrl, status } = req.body;
  
      const newApi = new scoreAPI({
        apiName,
        category,
        codeType,
        apiUrl,
        status: status || 'active'
      });
  
      await newApi.save();
  
      res.status(201).json({
        message: 'API created successfully',
        data: newApi
      });
    } catch (err) {
      console.error('Error creating Score API:', err);
      res.status(500).json({ error: 'Internal Server Error','msg':error.message });
    }
  };
  
  // ✅ Update an existing Score API
  exports.update = async (req, res) => {
    try {
      const { apiName, category, codeType, apiUrl, status } = req.body;
  
      const updated = await scoreAPI.findByIdAndUpdate(
        req.params.id,
        {
          apiName,
          category,
          codeType,
          apiUrl,
          status,
          updatedAt: new Date()
        },
        { new: true }
      );
  
      if (!updated) {
        return res.status(404).json({ error: 'API not found' });
      }
  
      res.json({
        message: 'API updated successfully',
        data: updated
      });
    } catch (err) {
      console.error('Error updating Score API:', err);
      res.status(500).json({ error: 'Internal Server Error','msg':error.message });
    }
  };
  
  // ✅ Get all Score APIs with counts
  exports.getAll = async (req, res) => {
    try {
      const apis = await scoreAPI.find().sort({ createdAt: -1 });
  
      const totalCount = apis.length;
      const activeCount = apis.filter(api => api.status === 'active').length;
      const inactiveCount = apis.filter(api => api.status === 'inactive').length;
      const suspendedCount = apis.filter(api => api.status === 'suspended').length;
  
      const tvCount = apis.filter(api => api.category === 'TV').length;
      const scoreCount = apis.filter(api => api.category === 'Score').length;
  
      res.json({
        totalCount,
        activeCount,
        inactiveCount,
        suspendedCount,
        categoryCounts: {
          TV: tvCount,
          Score: scoreCount
        },
        data: apis
      });
    } catch (err) {
      console.error('Error fetching Score APIs:', err);
      res.status(500).json({ error: 'Internal Server Error','msg':error.message });
    }
  };
  
  // ✅ Get Score API by ID
  exports.getById = async (req, res) => {
    try {
      const api = await scoreAPI.findById(req.params.id);
  
      if (!api) {
        return res.status(404).json({ error: 'API not found' });
      }
  
      res.json({ data: api });
    } catch (err) {
      console.error('Error fetching Score API by ID:', err);
      res.status(500).json({ error: 'Internal Server Error','msg':error.message });
    }
  };


  // ✅ Update Score API Status by ID
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['active', 'inactive', 'suspended'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Allowed: active, inactive, suspended' });
  }

  try {
    const api = await scoreAPI.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }

    res.json({ message: 'Status updated successfully', data: api });
  } catch (error) {
    console.error('Error updating Score API status:', error);
    res.status(500).json({ error: 'Internal Server Error', msg: error.message });
  }
};
