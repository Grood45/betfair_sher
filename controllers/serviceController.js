const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const EventList = require('../models/EventList'); 

  

exports.sportList = async (req, res) => {
  try {
    const sports = await Sport.find().sort({ position: 1 });

    return res.status(200).json({
      message: 'All sports fetched successfully',
      data: sports
    });
  } catch (error) {
    console.error('Error fetching sports:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch sports',
      error: error.message
    });
  }
};


exports.getEvents = async (req, res) => {
  try {
    const allEvents = await EventList.find()
      .populate('sportId', 'sportName position') // populate sport name and position
      .sort({ timestamp: -1 });

    return res.status(200).json({
      message: 'All events fetched successfully.',
      data: allEvents
    });
  } catch (error) {
    console.error('Get all events error:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch events.',
      error: error.message
    });
  }
};

