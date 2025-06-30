const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../../models/Sport');
const Match = require('../../models/Match');

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');

const currentIST = moment().tz("Asia/Kolkata").toDate();


exports.getAllSportNames = async (req, res) => {
  try {
    const sports = await Sport.find({}, { displayName: 1, icon: 1, position: 1 }).sort({ position: 1 });

    return res.status(200).json({
      message: 'Sports fetched successfully',
      data: sports
    });
  } catch (err) {
    console.error('Error fetching sports:', err.message);
    return res.status(500).json({
      message: 'Failed to fetch sports',
      error: err.message
    });
  }
};



exports.getInplayMatches = async (req, res) => {
  try {
    const { sportName, sportId } = req.params;


    // Build filter based on IST time
    const filter = {
      event_date: { $lte: currentIST }
    };

    if (sportName) {
      filter.sport_name = sportName;
    }

    if (sportId) {
      filter.sportId = sportId;
    }

    const matches = await Match.find(filter).sort({ event_date: 1 });

    res.status(200).json({
      message: 'In-play matches fetched successfully',
      count: matches.length,
      data: matches
    });

  } catch (err) {
    console.error('Error fetching in-play matches:', err);
    res.status(500).json({ message: 'Failed to fetch matches', error: err.message });
  }
};

