const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../models/Sport');
const Match = require('../models/Match');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');
const deepEqual = require('fast-deep-equal');
// Get current time in IST
const currentISTTime = moment().tz("Asia/Kolkata").toDate();


exports.syncAllMatches = async (req, res) => {
  try {
    const sports = await Sport.find({ betfairEventTypeId: { $ne: null } }).select('_id betfairEventTypeId');

    if (!sports || sports.length === 0) {
      return res.status(404).json({ message: 'No sports found with betfairEventTypeId' });
    }

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const sport of sports) {
      const sportId = sport.betfairEventTypeId;

      for (const isInPlay of [1, 0]) {
        const url = `https://apidiamond.online/sports/api/v1/listGames/${sportId}/${isInPlay}`;

        try {
          const response = await axios.get(url);
          const matches = response.data?.result || response.data?.data;

          if (!Array.isArray(matches)) {
            console.warn(`Invalid match data for sportId ${sportId}, inPlay=${isInPlay}`);
            console.log('Raw response:', response.data);
            continue;
          }

          for (const m of matches) {
            if (!m.eventId) continue;

            const existing = await Match.findOne({ eventId: m.eventId });

            const formattedData = {
              ...m,
              eventId: m.eventId,                          // primary key
              sport_id: sportId,                            // from API
              sportId: sport._id,                           // ref to Sport model
              is_in_play: isInPlay.toString()               // store as string (optional)
            };

            if (!existing) {
              await Match.create(formattedData);
              totalInserted++;
            } else {
              const mClean = JSON.parse(JSON.stringify(formattedData));
              const existingClean = JSON.parse(JSON.stringify(existing.toObject()));

              if (!deepEqual(existingClean, mClean)) {
                await Match.updateOne({ eventId: m.eventId }, formattedData);
                totalUpdated++;
              } else {
                totalSkipped++;
              }
            }
          }

        } catch (innerErr) {
          console.error(`Failed syncing sportId ${sportId} (inPlay=${isInPlay}):`, innerErr.message);
          continue;
        }
      }
    }

    return res.status(200).json({
      message: 'Sync completed',
      totalInserted,
      totalUpdated,
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
      .sort({ _id: 1 }) // Latest first
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


// Toggle betting using Mongo _id
exports.toggleBetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBettingEnabled } = req.body;

    if (typeof isBettingEnabled !== 'boolean') {
      return res.status(400).json({ message: 'isBettingEnabled must be true or false' });
    }

    const match = await Match.findByIdAndUpdate(
      id,
      { isBettingEnabled },
      { new: true }
    );

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.status(200).json({
      message: `Betting has been ${isBettingEnabled ? 'enabled' : 'disabled'}`,
      match
    });

  } catch (err) {
    console.error('Toggle betting error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getEventSummary = async (req, res) => {
  try {
    const allEvents = await Match.countDocuments();

    const liveEvents = await Match.countDocuments({
      time: { $lte: currentISTTime }
    }); 

    const upcomingEvents = allEvents - liveEvents;


    const totalMarketCount = await Sport.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$marketCount" }
        }
      }
    ]);
    
    const activeMarkets = totalMarketCount[0]?.total || 0;

    // Assuming providerId field exists
    const providers = await Match.distinct('providerId');
    const providerCount = providers.length;


    return res.status(200).json({
      message: 'Event summary fetched successfully',
      data: {
        totalEvents: allEvents,
        liveEvents,
        upcomingEvents,
        activeMarkets,
        providers: providerCount
      }
    });
  } catch (err) {
    console.error('Error in event summary:', err.message);
    return res.status(500).json({
      message: 'Failed to fetch event summary',
      error: err.message
    });
  }
};

exports.getAllMatchesBySportId = async (req, res) => {
  try {
    // Get query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sportId = req.params.sportId;

console.log(sportId);

    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (sportId) {
      filter.sportId = sportId;
    }

    // Query matches with optional sportId filter
    const matches = await Match.find(filter)
      .sort({ _id: 1 }) // oldest first; use -1 for newest first
      .skip(skip)
      .limit(limit);

    const total = await Match.countDocuments(filter);

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



