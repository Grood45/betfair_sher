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
    const sports = await Sport.find({ betfairEventTypeId: { $ne: null } }).select('_id betfairEventTypeId');

    if (!sports || sports.length === 0) {
      return res.status(404).json({ message: 'No sports found with betfairEventTypeId' });
    }

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const sport of sports) {
      const sportId = sport.betfairEventTypeId;
      const url = `https://apidiamond.online/sports/api/final-sport-list/${sportId}/false`; // false = upcoming, true = in-play

      try {
        const response = await axios.get(url);
        const matches = response.data?.sports || response.data?.data;

        if (!Array.isArray(matches)) {
          console.warn(`Invalid match data for sportId ${sportId}`);
          console.log('Raw response:', response.data);
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
            sport_id: sportId,    // external value
            sportId: sport._id,
            betfair_event_id:sportId
          }));

        if (newMatches.length > 0) {
          await Match.insertMany(newMatches);
        }

        totalInserted += newMatches.length;
        totalSkipped += existingIds.size;

      } catch (innerErr) {
        console.error(`Failed syncing sportId ${sportId}:`, innerErr.message);
        continue;
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
      $or: [{ isMatchLive: true }, { inplay: true }]
    });

    const upcomingEvents = allEvents - liveEvents;

    const activeMarkets = await Match.countDocuments({
      market_internal_id: { $ne: null }
    });

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



