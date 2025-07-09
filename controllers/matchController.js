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
    const sports = await Sport.find({ betfairEventTypeId: { $ne: null } }).select('_id betfairEventTypeId');

    if (!sports.length) {
      return res.status(404).json({ message: 'No sports with betfairEventTypeId' });
    }

    let totalInserted = 0;
    let totalFailed = 0;
    const failedMatches = [];

    for (const sport of sports) {
      const sportId = sport.betfairEventTypeId;
      const url = `https://apidiamond.online/sports/api/final-event-sport-list/${sportId}`;

      try {
        const { data } = await axios.get(url);
        const events = data?.sports || data?.result;

        if (!Array.isArray(events)) {
          console.warn(`Invalid data for sportId ${sportId}`);
          continue;
        }

        const newMatches = [];

        for (const ev of events) {
          const eventId = ev.event_id || ev.eventId;
          if (!eventId) continue;

          const eventDate = ev.event_date; // ⚠️ insert as-is without checking

          newMatches.push({
            eventId: eventId,
            betfair_event_id: ev.betfair_event_id || eventId,
            sportradar_event_id: ev.sportradar_event_id || "",
            sky_event_id: ev.sky_event_id || "",

            betfair_sport_id: ev.betfair_sport_id || "",
            sport_name: ev.sport_name || "",
            sportradar_sport_id: ev.sportradar_sport_id || "",

            betfair_competition_id: ev.betfair_competition_id || "",
            competition_name: ev.competition_name || "",
            sportradar_competition_id: ev.sportradar_competition_id || "",
            sportrader_compitionname: ev.sportrader_compitionname || "",
            sportrader_eventName: ev.sportrader_eventName || "",

            betfair_competitionRegion: ev.betfair_competitionRegion || "",

            event_name: ev.event_name || ev.sportrader_eventName || "",
            event_timezone: ev.event_timezone || "",
            event_date: eventDate,
            event_date_ist_formatted: ev.event_date_ist_formatted || "",

            is_in_play: ev.is_in_play || "",
            status: ev.status || "",

            isFancy: ev.isFancy === true || ev.is_fancy == "1",
            isBm: ev.isBm === true || ev.isbm == "1",
            isPremium: ev.isPremium === true || ev.is_premium == "1",

            sportsName: ev.sport_name || "",
            competitionName: ev.competition_name || "",
            totalMatched: Number(ev.total_matched || 0),

            is_fancy: ev.is_fancy || "",
            isbm: ev.isbm || "",
            is_premium: ev.is_premium || "",
            scoure_card: ev.scoure_card || "",
            accept_any_odds: ev.accept_any_odds || "",

            Sportrader_market_id: ev.Sportrader_market_id || "",
            betfair_event_marketCount: ev.betfair_event_marketCount || "",

            min_stake: ev.min_stake || "",
            max_stake: ev.max_stake || "",
            odd_limit: ev.odd_limit || "",
            bet_delay: ev.bet_delay || "",

            port: ev.port || "",
            live_tv_id: ev.live_tv_id || "",
            score_card_id: ev.score_card_id || "",
            sportrader_card_id: ev.sportrader_card_id || "",

            match_odds_market: ev.match_odds_market || [],

            sport_id: sportId,
            sportId: sport._id
          });
        }

        if (newMatches.length) {
          try {
            const result = await Match.insertMany(newMatches, { ordered: false });
            totalInserted += result.length;
          } catch (insertErr) {
            console.error(`Insert error for sportId ${sportId}:`, insertErr.message);
            totalFailed += newMatches.length;
            failedMatches.push(...newMatches.map(m => ({
              eventId: m.eventId,
              eventName: m.sportrader_eventName || m.event_name
            })));
          }
        }

      } catch (err) {
        console.error(`Sync error sportId ${sportId}:`, err.message);
        continue;
      }
    }

    res.status(200).json({
      message: 'Sync completed (insert only, no checks)',
      totalInserted,
      totalFailed,
      failedMatches
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



