const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../models/Sport');
const Match = require('../models/Match');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const fs = require('fs');
const path = require('path');
const axios = require('axios');



exports.syncAllMatches = async (req, res) => {
  try {
    const sports = await Sport.find({ externalId: { $ne: null } }).select('externalId');

    if (!sports || sports.length === 0) {
      return res.status(404).json({ message: 'No sports found with externalId' });
    }

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const sport of sports) {
      const sportId = sport.externalId;

      try {
        const response = await axios.get(`https://zplay1.in/pb/api/v1/events/matches/${sportId}`);
        const matches = response.data?.data;

        if (!Array.isArray(matches)) {
          console.warn(`Invalid match data for sportId ${sportId}`);
          continue;
        }

        const matchesFromApi = matches.filter(m => m.event_id);

        const existing = await Match.find({
          eventId: { $in: matchesFromApi.map(m => m.event_id) }
        }).select('eventId');

        const existingIds = new Set(existing.map(e => e.eventId));

        const newMatches = matchesFromApi
          .filter(m => !existingIds.has(m.event_id))
          .map(m => ({
            ...m,
            eventId: m.event_id,
            sport_id: sportId // make sure this matches your Match schema
          }));

        if (newMatches.length > 0) {
          await Match.insertMany(newMatches);
        }

        totalInserted += newMatches.length;
        totalSkipped += existingIds.size;

      } catch (innerErr) {
        console.error(`Failed syncing sportId ${sportId}:`, innerErr.message);
        continue; // Proceed to next sport
      }
    }

    return res.status(200).json({
      message: 'Sync completed',
      totalInserted,
      totalSkipped
    });

  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).json({
      message: 'Failed to sync matches for all sports',
      error: err.message
    });
  }
};


exports.getMatchesBySportId = async (req, res) => {
  try {
    const { sportId } = req.params;

    const matches = await Match.find({ sportId: parseInt(sportId) }).sort({ startTime: 1 });

    res.status(200).json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching matches', error: err.message });
  }
};


exports.getAllMatches = async (req, res) => {
  try {
    // Get page & limit from query params, with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const matches = await Match.find()
      .sort({ _id: -1 }) // Latest first
      .skip(skip)
      .limit(limit);

    const total = await Match.countDocuments();

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      matches
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch matches', error: err.message });
  }
};
