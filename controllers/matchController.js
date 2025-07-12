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
    let totalUpdated = 0;
    let totalFetched = 0;
    let totalFailed = 0;

    const failedMatches = [];
    const duplicates = [];
    const allEventIds = [];
    const fetchedEventMap = {};

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

        totalFetched += events.length;

        const bulkOps = [];

        for (const ev of events) {
          const eventId = ev.event_id || ev.eventId;
          if (!eventId) continue;

          const eventName = ev.sportrader_eventName || ev.event_name || "";

          allEventIds.push({ eventId, eventName });
          fetchedEventMap[eventId] = ev;

          let normalizedMarket = [];
          if (ev.match_odds_market) {
            if (Array.isArray(ev.match_odds_market)) {
              normalizedMarket = ev.match_odds_market;
            } else if (typeof ev.match_odds_market === 'object') {
              normalizedMarket = [ev.match_odds_market];
            }
          }

          const matchDoc = {
            eventId,
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
            sportrader_eventName: eventName,

            betfair_competitionRegion: ev.betfair_competitionRegion || "",

            event_name: eventName,
            event_timezone: ev.event_timezone || "",
            event_date: ev.event_date || "",
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

            match_odds_market: normalizedMarket,

            sport_id: sportId,
            sportId: sport._id
          };

          bulkOps.push({
            updateOne: {
              filter: { eventId },
              update: { $set: matchDoc },
              upsert: true
            }
          });
        }

        if (bulkOps.length) {
          const result = await Match.bulkWrite(bulkOps, { ordered: false });

          totalInserted += result.upsertedCount || 0;
          totalUpdated += result.modifiedCount || 0;
        }

      } catch (err) {
        console.error(`Sync error for sportId ${sportId}:`, err.message);
        continue;
      }
    }

    // Get notInserted (optional)
    const insertedDocs = await Match.find(
      { eventId: { $in: Object.keys(fetchedEventMap) } },
      { eventId: 1 }
    ).lean();

    const insertedEventIds = new Set(insertedDocs.map(doc => doc.eventId));

    const notInserted = Object.keys(fetchedEventMap)
      .filter(eventId => !insertedEventIds.has(eventId))
      .map(eventId => {
        const ev = fetchedEventMap[eventId];
        return {
          eventId,
          eventName: ev.sportrader_eventName || ev.event_name
        };
      });

    res.status(200).json({
      message: 'Sync completed (insert or update)',
      totalFetched,
      totalInserted,
      totalUpdated,
      totalFailed,
      duplicates,
      failedMatches,
      allEventIds,
      notInserted
    });

  } catch (err) {
    console.error('Global sync error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// exports.syncAllMatches = async (req, res) => {
//   try {
//     const sports = await Sport.find({ betfairEventTypeId: { $ne: null } }).select('_id betfairEventTypeId');

//     if (!sports.length) {
//       return res.status(404).json({ message: 'No sports with betfairEventTypeId' });
//     }

//     let totalInserted = 0;
//     let totalFailed = 0;
//     let totalFetched = 0;
//     const failedMatches = [];
//     const duplicates = [];
//     const allEventIds = [];
//     const fetchedEventMap = {};  // key = eventId, value = full object

//     for (const sport of sports) {
//       const sportId = sport.betfairEventTypeId;
//       const url = `https://apidiamond.online/sports/api/final-event-sport-list/${sportId}`;

//       try {
//         const { data } = await axios.get(url);
//         const events = data?.sports || data?.result;

//         if (!Array.isArray(events)) {
//           console.warn(`Invalid data for sportId ${sportId}`);
//           continue;
//         }

//         totalFetched += events.length;

//         const newMatches = [];

//         for (const ev of events) {
//           const eventId = ev.event_id || ev.eventId;
//           if (!eventId) continue;

//           const eventName = ev.sportrader_eventName || ev.event_name || "";

//           allEventIds.push({ eventId, eventName });
//           fetchedEventMap[eventId] = ev;

//           let normalizedMarket = [];
//           if (ev.match_odds_market) {
//             if (Array.isArray(ev.match_odds_market)) {
//               normalizedMarket = ev.match_odds_market;
//             } else if (typeof ev.match_odds_market === 'object') {
//               normalizedMarket = [ev.match_odds_market];
//             }
//           }

//           newMatches.push({
//             eventId,
//             betfair_event_id: ev.betfair_event_id || eventId,
//             sportradar_event_id: ev.sportradar_event_id || "",
//             sky_event_id: ev.sky_event_id || "",

//             betfair_sport_id: ev.betfair_sport_id || "",
//             sport_name: ev.sport_name || "",
//             sportradar_sport_id: ev.sportradar_sport_id || "",

//             betfair_competition_id: ev.betfair_competition_id || "",
//             competition_name: ev.competition_name || "",
//             sportradar_competition_id: ev.sportradar_competition_id || "",
//             sportrader_compitionname: ev.sportrader_compitionname || "",
//             sportrader_eventName: eventName,

//             betfair_competitionRegion: ev.betfair_competitionRegion || "",

//             event_name: eventName,
//             event_timezone: ev.event_timezone || "",
//             event_date: ev.event_date || "",
//             event_date_ist_formatted: ev.event_date_ist_formatted || "",

//             is_in_play: ev.is_in_play || "",
//             status: ev.status || "",

//             isFancy: ev.isFancy === true || ev.is_fancy == "1",
//             isBm: ev.isBm === true || ev.isbm == "1",
//             isPremium: ev.isPremium === true || ev.is_premium == "1",

//             sportsName: ev.sport_name || "",
//             competitionName: ev.competition_name || "",
//             totalMatched: Number(ev.total_matched || 0),

//             is_fancy: ev.is_fancy || "",
//             isbm: ev.isbm || "",
//             is_premium: ev.is_premium || "",
//             scoure_card: ev.scoure_card || "",
//             accept_any_odds: ev.accept_any_odds || "",

//             Sportrader_market_id: ev.Sportrader_market_id || "",
//             betfair_event_marketCount: ev.betfair_event_marketCount || "",

//             min_stake: ev.min_stake || "",
//             max_stake: ev.max_stake || "",
//             odd_limit: ev.odd_limit || "",
//             bet_delay: ev.bet_delay || "",

//             port: ev.port || "",
//             live_tv_id: ev.live_tv_id || "",
//             score_card_id: ev.score_card_id || "",
//             sportrader_card_id: ev.sportrader_card_id || "",

//             match_odds_market: normalizedMarket,

//             sport_id: sportId,
//             sportId: sport._id
//           });
//         }

//         if (newMatches.length) {
//           try {
//             const result = await Match.insertMany(newMatches, { ordered: false });
//             totalInserted += result.length;
//           } catch (insertErr) {
//             const writeErrors = insertErr?.writeErrors || [];

//             for (const err of writeErrors) {
//               const index = err.index;
//               const failedDoc = newMatches[index];

//               if (err.code === 11000) {
//                 duplicates.push({
//                   eventId: failedDoc.eventId,
//                   eventName: failedDoc.sportrader_eventName || failedDoc.event_name
//                 });
//               } else {
//                 failedMatches.push({
//                   eventId: failedDoc?.eventId || 'unknown',
//                   eventName: failedDoc?.sportrader_eventName || 'unknown',
//                   reason: err.errmsg || 'Unknown error'
//                 });
//               }
//             }

//             totalFailed += writeErrors.length;
//           }
//         }

//       } catch (err) {
//         console.error(`Sync error for sportId ${sportId}:`, err.message);
//         continue;
//       }
//     }

//     // Get all inserted eventIds from DB
//     const insertedDocs = await Match.find(
//       { eventId: { $in: Object.keys(fetchedEventMap) } },
//       { eventId: 1 }
//     ).lean();
//     const insertedEventIds = new Set(insertedDocs.map(doc => doc.eventId));

//     // Build notInserted with full event objects
//     const notInserted = Object.keys(fetchedEventMap)
//       .filter(eventId => !insertedEventIds.has(eventId))
//       .map(eventId => fetchedEventMap[eventId]);

//     res.status(200).json({
//       message: 'Sync completed (insert only)',
//       totalFetched,
//       totalInserted,
//       totalFailed,
//       duplicates,
//       failedMatches,
//       allEventIds,
//       notInserted
//     });

//   } catch (err) {
//     console.error('Global sync error:', err.message);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };




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
    const sportId = req.params.sportId;
    const filter = {};

    if (sportId) {
      filter.sportId = sportId;
    }

    const matches = await Match.find(filter).lean();

    const grouped = {
      today: [],
      tomorrow: [],
      dayAfterTomorrow: [],
      upcoming: []
    };

    const nowIST = moment().tz('Asia/Kolkata');
    const today = nowIST.clone().startOf('day');
    const tomorrow = today.clone().add(1, 'day');
    const dayAfterTomorrow = today.clone().add(2, 'day');

    const isInPlay = (eventDateRaw) => {
      let date;
      if (typeof eventDateRaw === 'string' && /^\d+$/.test(eventDateRaw)) {
        date = moment.tz(parseInt(eventDateRaw), 'Asia/Kolkata');
      } else if (typeof eventDateRaw === 'number') {
        date = moment.tz(eventDateRaw, 'Asia/Kolkata');
      } else {
        date = moment.tz(eventDateRaw, 'Asia/Kolkata');
      }
      return date.isValid() && date.isSameOrAfter(nowIST);
    };

    for (const match of matches) {
      const eventDate = match.event_date;
      if (!eventDate) continue;

      let eventMoment;
      if (typeof eventDate === 'string' && /^\d+$/.test(eventDate)) {
        eventMoment = moment.tz(parseInt(eventDate), 'Asia/Kolkata');
      } else if (typeof eventDate === 'number') {
        eventMoment = moment.tz(eventDate, 'Asia/Kolkata');
      } else {
        eventMoment = moment.tz(eventDate, 'Asia/Kolkata');
      }

      if (!eventMoment.isValid()) continue;

      const eventDay = eventMoment.clone().startOf('day');

      const matchWithFlag = {
        ...match,
        isInPlay: isInPlay(eventDate)
      };

      if (eventDay.isSame(today)) {
        grouped.today.push(matchWithFlag);
      } else if (eventDay.isSame(tomorrow)) {
        grouped.tomorrow.push(matchWithFlag);
      } else if (eventDay.isSame(dayAfterTomorrow)) {
        grouped.dayAfterTomorrow.push(matchWithFlag);
      } else if (eventDay.isAfter(dayAfterTomorrow)) {
        grouped.upcoming.push(matchWithFlag);
      }
    }

    const sortByEventDateDesc = (a, b) =>
      Number(b.event_date) - Number(a.event_date);

    const sortWithInplayFirst = (arr) => {
      const inplay = arr.filter(m => m.isInPlay);
      const rest = arr.filter(m => !m.isInPlay);
      return [
        ...inplay.sort(sortByEventDateDesc),
        ...rest.sort(sortByEventDateDesc)
      ];
    };

    res.status(200).json({
      groupedMatches: {
        today: sortWithInplayFirst(grouped.today),
        tomorrow: sortWithInplayFirst(grouped.tomorrow),
        dayAfterTomorrow: sortWithInplayFirst(grouped.dayAfterTomorrow),
        upcoming: sortWithInplayFirst(grouped.upcoming)
      }
    });

  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch matches',
      error: err.message
    });
  }
};


exports.syncPremiumEvent = async (req, res) => {
  try {
    const { sportId, eventId } = req.body;

    if (!sportId || !eventId) {
      return res.status(400).json({ message: 'sportId and eventId are required' });
    }

    // 1️⃣ Send POST request
    const response = await axios.post(
      'https://apidiamond.online/sports/api/v1/feed/betfair-market-in-sr',
      { sportId, eventId },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response;

    // 2️⃣ Validate API response
    if (!data) {
      return res.status(400).json({ message: 'Invalid or missing data from external API', data });
    }

    // 3️⃣ Upsert into MongoDB with jsonData
    const result = await PremiumEvent.findOneAndUpdate(
      { eventId: eventId },
      {
        $set: {
          sportId,
          eventId,
          jsonData: data
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: result.createdAt?.getTime() === result.updatedAt?.getTime()
        ? 'Inserted new premium event'
        : 'Updated existing premium event',
      _id: result._id,
      data: data
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



