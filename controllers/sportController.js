const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../models/Sport');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const fs = require('fs');
const path = require('path');
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

      // Save new icon path
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

    res.json({ message: 'Sport updated successfully', data: updatedSport });
  } catch (error) {
    console.error('Update Sport Error:', error);
    res.status(500).json({ error: 'Internal Server Error', msg: error.message });
  }
};

