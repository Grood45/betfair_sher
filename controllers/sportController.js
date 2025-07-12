const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../models/Sport');
const User = require('../models/User');
const Match = require('../models/Match');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');

// GET /api/sports
exports.getAll = async (req, res) => {
  try {
    const sports = await Sport.aggregate([
      {
        $addFields: {
          sortPriority: {
            $cond: { if: { $eq: ['$position', 1] }, then: 0, else: 1 }
          }
        }
      },
      {
        $sort: { sortPriority: 1, position: 1, _id: -1 } // 👈 Custom priority, then position, then newest
      },
      {
        $project: { sortPriority: 0 } // 👈 Remove sort helper from result
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Sports fetched and sorted by position',
      data: sports
    });
  } catch (error) {
    console.error('Get All Sports Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      msg: error.message
    });
  }
};



exports.sync = async (req, res) => {
  try {
    const apiResponse = await axios.post('https://apidiamond.online/sports/api/v2/api/sport-list');

    const data = apiResponse.data;

    if (!data || data.status !== "1" || !Array.isArray(data.sports)) {
      return res.status(400).json({ error: 'Invalid data from external API' });
    }

    const sports = data.sports;
    const added = [];
    const skipped = [];

    for (const sport of sports) {
      // Check if already exists by sportName or betfairEventTypeId
      const exists = await Sport.findOne({
        $or: [
          { displayName: sport.sportName },
          { betfairEventTypeId: sport.betfairEventTypeId }
        ]
      });

      if (exists) {
        skipped.push(sport.sportName);
        continue;
      }

      const newSport = new Sport({
        displayName: sport.sportName,
        sportName: sport.sportName,
        childName: sport.childName || '',
        marketCount: parseInt(sport.marketCount || '0'),
        position: parseInt(sport.position || '0'),
        sportStatus: sport.status === 'active' ? 'active' : 'inactive',
        bettingEnabled: sport.bettingEnabled === 'true',
        maxBetLimit: parseInt(sport.maxBetLimit || '0'),
        minBetLimit: parseInt(sport.minBetLimit || '0'),
        oddsProvider: sport.oddsProvider || '',
        featured: sport.featured === '1',
        betfairEventTypeId: sport.betfairEventTypeId || '',
        sportradarSportId: sport.sportradarSportId || '',
        sportId: sport.betfairEventTypeId || ''
      });

      const saved = await newSport.save();
      added.push(saved);
    }

    return res.status(201).json({
      message: 'Sports synced successfully',
      addedCount: added.length,
      skippedCount: skipped.length,
      added,
      skipped
    });

  } catch (error) {
    console.error('Sync Sports Error:', error);
    res.status(500).json({ error: 'Internal Server Error', msg: error.message });
  }
};
// POST /api/sports
exports.create = async (req, res) => {
  try {
    const {
      displayName,
      position,
      provider,
      minBet,
      maxBet,
      bettingStatus,
      sportStatus
    } = req.body;

    let icon = '';
    if (req.file) {
      icon = `/uploads/icons/${req.file.filename}`;  // if using multer for file upload
    }

    const newSport = new Sport({
      icon,
      displayName,
      position,
      provider,
      minBet,
      maxBet,
      bettingStatus,
      sportStatus
    });

    await newSport.save();

    res.status(201).json({ message: 'Sport created successfully', data: newSport });
  } catch (error) {
    console.error('Create Sport Error:', error);
    res.status(500).json({ error: 'Internal Server Error', msg: error.message });
  }
};

// PUT /api/sports/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      displayName,
      position,
      provider,
      minBet,
      maxBet,
      bettingStatus,
      sportStatus
    } = req.body;

    // Fetch the current sport to check old icon
    const existingSport = await Sport.findById(id);
    if (!existingSport) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    // Handle new icon upload
    let iconUpdate = {};
    if (req.file) {
      // Remove old icon if exists
      if (existingSport.icon) {
        const oldPath = path.join(__dirname, '..', existingSport.icon);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath); // 🗑 delete old file
        }
      }

      // Save new icon pathUser
      iconUpdate.icon = `/uploads/icons/${req.file.filename}`;
    }

    // Perform the update
    const updatedSport = await Sport.findByIdAndUpdate(
      id,
      {
        displayName,
        sportName:displayName,
        position,
        provider,
        minBetLimit: minBet, 
        maxBetLimit: maxBet,
        bettingStatus,
        sportStatus,
        ...iconUpdate
      },
      { new: true }
    );

    await Match.updateMany(
      {sportId:id},
      { isBettingEnabled: bettingStatus }, // update field
      { new: true } // return the updated document
    );

    res.json({ message: 'Sport updated successfully', data: updatedSport });
  } catch (error) {
    console.error('Update Sport Error:', error);
    res.status(500).json({ error: 'Internal Server Error', msg: error.message });
  }
};


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
