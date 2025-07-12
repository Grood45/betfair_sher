const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../../models/Sport');
const Match = require('../../models/Match');
const PremiumEvent = require('../../models/PremiumEvent');

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');
const mongoose = require('mongoose');

const currentIST = moment().tz("Asia/Kolkata").toDate();


exports.getAllSportNames = async (req, res) => {
  try {
    const sports = await Sport.find({}, { displayName: 1, icon: 1, position: 1 }).sort({ position: 1 });

    const currentIST = moment().tz("Asia/Kolkata").toDate();

    const sportsWithCounts = await Promise.all(sports.map(async (sport) => {
      const sportId = sport._id.toString();

      const sportMatches = await Match.find({ sportId: sportId });

      let inplayCount = 0;
      let upcomingCount = 0;

      sportMatches.forEach(match => {
        const matchEventDate = moment(match.event_date);
        
        if (matchEventDate.isValid()) {
            if (matchEventDate.isBefore(currentIST)) {
                inplayCount++;
            } else {
                upcomingCount++;
            }
        }
      });

      return {
        ...sport.toObject(),
        inplayCount,
        upcomingCount
      };
    }));

    return res.status(200).json({
      message: 'Sports fetched successfully',
      data: sportsWithCounts
    });
  } catch (err) {
    console.error('Error fetching sports:', err.message);
    return res.status(500).json({
      message: 'Failed to fetch sports',
      error: err.message
    });
  }
};

//premium 


exports.getInplayMatches = async (req, res) => {
  try {
    const { sportName, sportId } = req.params;


    // Build filter based on IST time
    const filter = {
      time: { $lte: currentIST }
    };

    if (sportName) {
      filter.sport_name = sportName;
    }

    if (sportId) {
      filter.sportId = sportId;
    }

      // Validate if it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(sportId)) {
    return res.status(400).json({ message: 'Invalid sportId' });
  }
  const matches = await Match.find({ sportId });

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

exports.getInplayFancy = async (req, res) => {
  try {
    const { sportName, sportId } = req.params;


    // Build filter based on IST time
    const filter = {
      time: { $lte: currentIST }
    };

    if (sportName) {
      filter.sport_name = sportName;
    }

    if (sportId) {
      filter.sportId = sportId;
    }

      // Validate if it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(sportId)) {
    return res.status(400).json({ message: 'Invalid sportId' });
  }
  const matches = await Match.find({ sportId });

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

exports.getInplayPremium = async (req, res) => {
  try {
    const { sportName, sportId } = req.params;


    // Build filter based on IST time
    const filter = {
      time: { $lte: currentIST }
    };

    if (sportName) {
      filter.sport_name = sportName;
    }

    if (sportId) {
      filter.sportId = sportId;
    }

      // Validate if it's a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(sportId)) {
    return res.status(400).json({ message: 'Invalid sportId' });
  }
  const matches = await Match.find({ sportId });

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



