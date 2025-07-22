const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const EventList = require('../models/EventList'); 
const mongoose = require('mongoose');
const SpotRadarEvent = require('../models/SpotRadarEvent');
const BetfairMarketlist = require('../models/BetfairMarketlist');
const BetfairMarketOdds = require('../models/BetfairMarketOdds');
const BetfairMarketResult = require('../models/MarketResult');
 

exports.sportList = async (req, res) => {
  try {
    const sports = await Sport.find().sort({ position: 1 });

    return res.status(200).json({
      message: 'All sports fetched successfully',
      data: sports
    });
  } catch (error) {
    console.error('Error fetching sports:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch sports',
      error: error.message
    });
  }
};



exports.getEvents = async (req, res) => {
  try {
    const { fastOddsId } = req.params;

    if (!fastOddsId || !mongoose.Types.ObjectId.isValid(fastOddsId)) {
      return res.status(400).json({
        message: 'Valid fastOddsId parameter is required.',
      });
    }

    const objectId = new mongoose.Types.ObjectId(fastOddsId);

    const data = await EventList.findOne({ FastoddsId: objectId }).sort({ timestamp: -1 });
    const spotRadarData = await SpotRadarEvent.findOne({ FastoddsId: objectId });

    if (!data || !spotRadarData) {
      return res.status(404).json({ message: 'Event data not found for the provided FastoddsId.' });
    }

    const betfairEvents = data.betfairEventList.events || [];
    const spotRadarEvents = spotRadarData.spotradardeventlist || [];

    const normalizeAndSort = (name) => {
      if (!name) return '';
    
      const teams = name
        .toLowerCase()
        .replace(/[@]| at | v[.]?s?[.]? | vs[.]?/gi, ' vs ') // normalize separators
        .replace(/[^a-z0-9\s]/gi, '') // remove unwanted special characters
        .split('vs') // split on "vs"
        .map(team => team.trim())
        .sort(); // sort alphabetically
    
      return teams.join(' vs ');
    };

    const matchedRadarIds = new Set();

    const enrichedEvents = betfairEvents.map((event) => {
      const normalizedBetfairName = normalizeAndSort(event.name || '');
      console.log(`normalizedBetfairName: "${normalizedBetfairName}"`);

      let matchedRadar = null;

      for (const sre of spotRadarEvents) {
        const normalizedSportradarName = normalizeAndSort(sre.eventName || '');
        console.log(`🟡 Comparing:\n  Betfair: "${event.name}" → "${normalizedBetfairName}"\n  Sportradar: "${sre.eventName}" → "${normalizedSportradarName}"`);

        if (normalizedBetfairName === normalizedSportradarName) {
          console.log(`✅ Matched: "${sre.eventId}" -- ${event.name}" == "${sre.eventName}"`);
          matchedRadar = sre;
          matchedRadarIds.add(sre.eventId);
          break;
        }
      }

      return {
        event_name: event.name,
        event_date: event.event_date,
        status: matchedRadar?.status || 0,
        betfair_event_id: event.event_id,
        betfair_sport_id: event.sportId,
        spotradarSportId: matchedRadar?.sportId || 0,
        spotradarEventId: matchedRadar?.eventId || 0,
        ...event,
        sportradarEventDetails:matchedRadar || 0
      };
    });

    // Add unmatched Sportradar events
    const unmatchedSportradarEvents = spotRadarEvents
      .filter(sre => !matchedRadarIds.has(sre.eventId))
      .map(sre => ({
        event_name: sre.eventName,
        event_date: new Date(sre.openDate).toISOString(),
        status: sre.status,
        betfair_event_id: 0,
        betfair_sport_id: 0,
        spotradarSportId: sre.sportId,
        spotradarEventId: sre.eventId,
        "isFancy": "",
        "isBM": "",
        "isPremium": "",
        "score": true,
        "tv": false,
        "position": 1,
        sportradarEventDetails: sre,
      }));

    // Combine both
    const finalEvents = [...enrichedEvents, ...unmatchedSportradarEvents];

    return res.status(200).json({
      message: 'Events fetched and enriched successfully.',
      data: finalEvents,
    });

  } catch (error) {
    console.error('❌ Error fetching events:', error);
    return res.status(500).json({
      message: 'Failed to fetch events.',
      error: error.message,
    });
  }
};


exports.getBetfairMarketByEventsId = async (req, res) => {
  try {
    const { sportId, eventId } = req.params;

    if (!sportId || !eventId) {
      return res.status(400).json({
        status: 0,
        message: 'Missing sportId or eventId',
      });
    }

    // Find document by sportId and ensure eventId exists in marketList (for safety)
    const marketDoc = await BetfairMarketlist.findOne({
      FastoddsId: sportId,
      betfair_event_id: eventId
    });

    if (!marketDoc) {
      return res.status(404).json({
        status: 0,
        message: 'No market data found for the given sportId and eventId',
      });
    }

    // No filtering — return full marketList
    return res.status(200).json({
      status: 1,
      FastoddsId: marketDoc.FastoddsId,
      sportId,
      eventId,
      marketList: marketDoc.marketList,
    });

  } catch (error) {
    console.error('Error in getBetfairMarketByEventsId:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

exports.getBetfairMarketOddsByEventsId = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        status: 0,
        message: 'Missing sportId or eventId',
      });
    }

    // Fetch odds directly from BetfairMarketOdds using both filters
    const oddsList = await BetfairMarketOdds.find({
      betfair_event_id: eventId,
    });

    if (!oddsList || oddsList.length === 0) {
      return res.status(400).json({
        status: 0,
        message: 'No odds found for this event and sport',
      });
    }

    return res.status(200).json({
      status: 1,
      message: 'Market odds found for this event and sport',
      betfair_event_id:eventId,
      odds: oddsList,
    });

  } catch (error) {
    console.error('Error in getBetfairMarketOddsByEventsId:', error);
    return res.status(500).json({
      status: 0,
      message: 'Internal server error',
    });
  }
};

exports.liveBetfairMarketsOddsByParams = async (req, res) => {
  try {
    const { sportId, eventId } = req.params;

    if (!sportId || !eventId) {
      return res.status(400).json({ error: 'sportId and eventId are required in params' });
    }

    const marketRecords = await BetfairMarketlist.find({ betfair_event_id: eventId });

    if (!marketRecords.length) {
      return res.status(404).json({ error: 'No market records found for the given eventId' });
    }

    const marketIds = marketRecords
      .map(record => record.marketList?.[0]?.marketId)
      .filter(Boolean);

    if (!marketIds.length) {
      return res.status(404).json({ error: 'No valid marketIds found in market records' });
    }

    const marketIdsCSV = marketIds.join(',');
    console.log("Sending marketIds:", marketIdsCSV);

    const response = await axios.post(
      'https://exchmarket.net/exchangeapi/sports/directmarketsbook',
      marketIdsCSV,
      {
        headers: {
          'Content-Type': 'application/json'  // Keep as is unless API says otherwise
        }
      }
    );

    const result = response.data?.result || [];

    res.status(200).json({
      status: 1,
      marketCount: marketIds.length,
      result
    });

  } catch (error) {
    console.error('Error fetching market odds:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getBetfairMarketResultsByIds = async (req, res) => {
  try {
    const { marketId } = req.body;

    if (!marketId) {
      return res.status(400).json({
        status: 0,
        message: 'marketId parameter is required',
      });
    }

    // Convert CSV string to array and clean spaces
    const marketIdArray = marketId.split(',').map(id => id.trim());

    // Limit to 30 marketIds max
    if (marketIdArray.length > 30) {
      return res.status(400).json({
        status: 0,
        message: 'Maximum 30 market IDs are allowed per request',
      });
    }

    // Query DB
    const results = await BetfairMarketResult.find({
      marketId: { $in: marketIdArray }
    });

    if (!results || results.length === 0) {
      return res.status(404).json({
        status: 0,
        message: 'No market results found for the given IDs',
      });
    }

    return res.status(200).json({
      status: 1,
      message: 'Market results retrieved successfully',
      data: results
    });

  } catch (error) {
    console.error('Error in getBetfairMarketResultsByIds:', error.message);
    return res.status(500).json({
      status: 0,
      message: 'Internal server error',
      error: error.message
    });
  }
};








