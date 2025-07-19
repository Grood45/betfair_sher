const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const EventList = require('../models/EventList'); 
const mongoose = require('mongoose');

  

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
    const { fastOddsId } = req.params;

    if (!fastOddsId) {
      return res.status(400).json({
        message: 'fastOddsId parameter is required.',
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(fastOddsId)) {
      return res.status(400).json({
        message: 'Invalid fastOddsId format.',
      });
    }

    const objectId = new mongoose.Types.ObjectId(fastOddsId);

    const events = await EventList.find({ fastOddsId: objectId }).sort({ timestamp: -1 });

    return res.status(200).json({
      message: 'Events fetched successfully.',
      data: events,
    });
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch events.',
      error: error.message,
    });
  }
};


