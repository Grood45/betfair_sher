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

    if (!fastOddsId) {
      return res.status(400).json({
        message: 'fastOddsId parameter is required.',
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(fastOddsId)) {
      return res.status(400).json({
        message: 'Invalid fastOddsId format.',
      });
    }

    const objectId = new mongoose.Types.ObjectId(fastOddsId);

    // Fetch Betfair event list
    const data = await EventList.findOne({ FastoddsId: objectId }).sort({ timestamp: -1 });

    // Fetch SpotRadar event list
    const spotRadarData = await SpotRadarEvent.findOne({ FastoddsId: objectId });

    if (!data || !spotRadarData) {
      return res.status(404).json({
        message: 'Event data not found for the provided FastoddsId.',
      });
    }

    const betfairEvents = data.betfairEventList.events || [];
    const spotRadarEvents = spotRadarData.spotradarEventList || [];

    // Map through Betfair events and enrich with SpotRadar info if names match
    const enrichedEvents = betfairEvents.map((event) => {
      const match = spotRadarEvents.find(
        (sre) => sre.eventName?.trim().toLowerCase() === event.name?.trim().toLowerCase()
      );

      if (match) {
        return {
          ...event,
          spotradarSportId: match.sportId,
          spotradarEventId: match.eventId,
        };
      }

      return event;
    });

    return res.status(200).json({
      message: 'Events fetched and enriched successfully.',
      data: enrichedEvents,
    });
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch events.',
      error: error.message,
    });
  }
};
