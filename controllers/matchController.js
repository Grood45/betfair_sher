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
const PremiumEvent = require('../models/PremiumEvent');

// Get current time in IST
const currentISTTime = moment().tz("Asia/Kolkata").toDate();


exports.syncAllMatches = async (req, res) => {
  try {
    const sports = await Sport.find({ betfairEventTypeId: { $ne: null } })
                              .select('_id betfairEventTypeId');

    if (!sports.length) {
      return res.status(404).json({ message: 'No sports with betfairEventTypeId' });
    }

    let totalInserted = 0;
    let totalUpdated  = 0;
    let totalSkipped  = 0;
    let totalFailed   = 0;

    const skippedEventDetails = [];
    const allEventIdMap = new Map(); // eventId → eventName
    const seenEventIds = new Set();  // to prevent duplicates in same sync run

    for (const sport of sports) {
      const sportId = sport.betfairEventTypeId;
      const url     = `https://apidiamond.online/sports/api/final-event-sport-list/${sportId}`;

      try {
        const { data } = await axios.get(url);
        const events = data?.sports || data?.result;

        if (!Array.isArray(events)) {
          console.warn(`Invalid data for sportId ${sportId}`);
          continue;
        }

        const bulkOps = [];

        for (const ev of events) {
          try {
            const eventId = ev.event_id || ev.eventId;
            const eventName = ev.sportrader_eventName || ev.event_name || '';

            if (!eventId || seenEventIds.has(eventId)) continue;

            seenEventIds.add(eventId);
            allEventIdMap.set(eventId, eventName);

            // Normalize event_date
            let eventDate = ev.event_date;
            if (typeof eventDate === 'string' || typeof eventDate === 'number') {
              eventDate = new Date(Number(eventDate));
            } else if (!(eventDate instanceof Date)) {
              eventDate = null;
            }

            const doc = {
              ...ev,
              eventId,
              sport_id: sportId,
              sportId: sport._id,
              betfair_event_id: ev.betfair_event_id || eventId,
              event_date: eventDate
            };

            bulkOps.push({
              updateOne: {
                filter: { eventId },
                update: [{ $set: doc }],
                upsert: true
              }
            });

          } catch (innerErr) {
            console.error(`Match build error (eventId: ${ev?.event_id || 'N/A'}):`, innerErr.message);
            totalFailed++;
          }
        }

        if (bulkOps.length) {
          const result = await Match.bulkWrite(bulkOps, { ordered: false });

          const inserted = result.upsertedCount || 0;
          const updated = result.modifiedCount || 0;
          const matched = result.matchedCount || 0;
          const skipped = matched - updated;

          totalInserted += inserted;
          totalUpdated += updated;
          totalSkipped += skipped;

          // Log skipped eventIds
          const skippedIds = bulkOps
            .map(op => op.updateOne.filter.eventId)
            .slice(inserted + updated, inserted + updated + skipped);

          skippedIds.forEach(eventId => {
            skippedEventDetails.push({
              eventId,
              eventName: allEventIdMap.get(eventId)
            });
          });
        }

      } catch (err) {
        console.error(`Failed to sync sportId ${sportId}:`, err.message);
        continue;
      }
    }

    return res.status(200).json({
      message: 'Sync completed',
      totalInserted,
      totalUpdated,
      totalSkipped,
      totalFailed,
      skippedEvents: skippedEventDetails
    });

  } catch (err) {
    console.error('Global sync error:', err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
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


exports.syncPremiumEvent = async (req, res) => {
  try {
    const { sportId, eventId } = req.params;

    if (!sportId || !eventId) {
      return res.status(400).json({ message: 'sportId and eventId are required' });
    }

    // 1️⃣ Send POST request as JSON payload (not form-data)
    const { data } = await axios.post(
      'https://apidiamond.online/sports/api/v1/feed/betfair-market-in-sr',
      { sportId, eventId }, // JSON body
      { headers: { 'Content-Type': 'application/json' } }
    );

    // 2️⃣ Validate API response
    if (!data || data.errorCode !== 0 || !data.eventId) {
      return res.status(400).json({ message: 'Invalid or missing data from external API', data });
    }

    // 3️⃣ Upsert into MongoDB
    const result = await PremiumEvent.findOneAndUpdate(
      { eventId: data.eventId },
      { $set: data },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: result.createdAt?.getTime() === result.updatedAt?.getTime()
        ? 'Inserted new premium event'
        : 'Updated existing premium event',
      _id: result._id,
      eventId: result.eventId
    });

  } catch (err) {
    console.error('Premium sync error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPremiumEventByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required' });
    }

    const event = await PremiumEvent.findOne({ eventId });

    if (!event) {
      return res.status(404).json({ message: 'Premium event not found' });
    }

    res.status(200).json({
      message: 'Premium event found',
      data: event
    });

  } catch (error) {
    console.error('Error fetching premium event:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



