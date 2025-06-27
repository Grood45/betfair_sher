const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../models/Sport');
const User = require('../models/User');
const Match = require('../models/Match');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const fs = require('fs');
const path = require('path');
const axios = require('axios');


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
    const apiResponse = await axios.get('https://zplay1.in/sports/api/v1/sports/management/getSport');

    if (!apiResponse.data.success || !Array.isArray(apiResponse.data.data)) {
      return res.status(400).json({ error: 'Invalid data from external API' });
    }

    const sports = apiResponse.data.data;
    const added = [];
    const skipped = [];

    for (const sport of sports) {
      // Check if already exists by externalId (preferred) or slug
      const exists = await Sport.findOne({ externalId: sport.id });
      if (exists) {
        skipped.push(sport.slug);
        continue; // ⛔ Skip if already exists
      }

      const newSport = new Sport({
        externalId: sport.id,
        sportId: sport.id,
        displayName: sport.name,
        position: sport.rank || 0,
        provider: sport.slug || 'default-provider',
        minBet: 0,
        maxBet: 0,
        bettingStatus: 1,
        sportStatus: sport.is_custom === 1 ? 'inactive' : 'active',
        icon: sport.sport_icon || '',
        banner: sport.banner_image || ''
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
    console.error('Create Sport Error:', error);
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
        position,
        provider,
        minBet,
        maxBet,
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
    const sports = await Sport.find({}, { displayName: 1,icon:1 }); // select name and _id
                                 // optional: sort alphabetically

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
