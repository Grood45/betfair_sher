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
      const teams = name
        .toLowerCase()
        .replace(/[@]/g, 'vs') // replace @ with vs
        .replace(/[^a-z0-9\s]/gi, '') // remove special chars
        .split(/vs|\bat\b/)
        .map(team => team.trim())
        .sort();
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
          console.log(`✅ Matched: "${event.name}" == "${sre.eventName}"`);
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


