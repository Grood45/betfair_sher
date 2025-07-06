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

    for (const sport of sports) {
      const sportId = sport.betfairEventTypeId;
      const url     = `https://apidiamond.online/sports/api/final-event-sport-list/${sportId}`;

      try {
        const { data } = await axios.get(url);
        const events   = data?.sports || data?.result;

        if (!Array.isArray(events)) {
          console.warn(`Invalid data for sportId ${sportId}`);   // continue next sport
          continue;
        }

        /* ------------ build bulk operations ------------ */
        const bulkOps = [];

        for (const ev of events) {
          const eventId = ev.event_id || ev.eventId;
          if (!eventId) continue;                                // skip if no ID

          // Attach your extra fields
          const doc = {
            ...ev,
            eventId:             eventId,
            sport_id:            sportId,   // external code
            sportId:             sport._id, // Mongo ref
            betfair_event_id:    ev.betfair_event_id || eventId
          };

          bulkOps.push({
            updateOne: {
              filter: { eventId },
              /** check for changes to avoid unnecessary writes */
              update: [
                {
                  $set: doc
                }
              ],
              upsert: true
            }
          });
        }

        /* ------------ execute bulkWrite ------------ */
        if (bulkOps.length) {
          const result = await Match.bulkWrite(bulkOps, { ordered: false });

          totalInserted += (result.upsertedCount || 0);
          totalUpdated  += (result.modifiedCount  || 0);
          // skipped = attempted - (inserted+updated)
          totalSkipped  += bulkOps.length - (result.upsertedCount + result.modifiedCount);
        }

      } catch (err) {
        console.error(`Sync error sportId ${sportId} :`, err.message);
        continue; // proceed with next sport
      }
    }

    res.status(200).json({
      message: 'Sync completed',
      totalInserted,
      totalUpdated,
      totalSkipped
    });

  } catch (err) {
    console.error('Global sync error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
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


exports.syncAllPremiumEvents = async (_req, res) => {
  try {
    // 1️⃣  fetch every match that has an eventId + external sport_id
    const matches = await Match.find(
      { eventId: { $ne: null }, sport_id: { $ne: null } },
      { eventId: 1, sport_id: 1 }
    );

    if (!matches.length) {
      return res.status(404).json({ message: 'No matches with eventId + sport_id found' });
    }

    let inserted = 0;
    let updated  = 0;
    let skipped  = 0;
    let failed   = 0;

    // 2️⃣  build an array of limited‑concurrency promises
    const tasks = matches.map(({ eventId, sport_id }) =>
      limit(async () => {
        try {
          // call external feed (JSON body, not form‑data)
          const { data } = await axios.post(
            'https://apidiamond.online/sports/api/v1/feed/betfair-market-in-sr',
            { sport_id, eventId },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (!data || data.errorCode !== 0 || !data.eventId) {
            skipped++;
            return;
          }

          const result = await PremiumEvent.findOneAndUpdate(
            { eventId: data.eventId },
            { $set: data },
            { new: true, upsert: true }
          );

          // Identify whether it was insert or update
          if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++;
          else updated++;
        } catch (err) {
          failed++;
          console.error(`Feed sync failed (event ${eventId}):`, err.message);
        }
      })
    );

    // 3️⃣  wait for all promises
    await Promise.all(tasks);

    // 4️⃣  respond summary
    res.status(200).json({
      message: 'Bulk premium sync completed',
      inserted,
      updated,
      skipped,
      failed
    });

  } catch (err) {
    console.error('Bulk premium sync error:', err.message);
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



