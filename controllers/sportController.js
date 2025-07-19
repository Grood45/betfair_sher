const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const EventList = require('../models/EventList'); 
  
exports.sportList = async (req, res) => {
  const betfairAppKey = 'fslpapQyGZSmkZW3';
  const betfairSessionToken = 'FnY1o16yM53LM7dYWk6aE1oD4RuzoReewegst5yJtbk=';
  const betfairUrl = 'https://api.betfair.com/exchange/betting/json-rpc/v1';

  const betfairHeaders = {
    'X-Application': betfairAppKey,
    'X-Authentication': betfairSessionToken,
    'Content-Type': 'application/json'
  };

  const betfairPayload = [{
    jsonrpc: '2.0',
    method: 'SportsAPING/v1.0/listEventTypes',
    params: { filter: {} },
    id: 1
  }];

  const sportradarUrl = 'https://scatalog.mysportsfeed.io/api/v1/core/getsports';
  const sportradarPayload = {
    operatorId: 'laser247',
    providerId: 'SportRadar',
    token: 'c0e509b0-6bc1-4132-80cb-71b54345af12'
  };

  try {
    // Step 1: Fetch sports from both APIs
    const [betfairRes, sportradarRes] = await Promise.all([
      axios.post(betfairUrl, betfairPayload, { headers: betfairHeaders }),
      axios.post(sportradarUrl, sportradarPayload)
    ]);

    const betfairResult = betfairRes.data[0]?.result || [];
    const sportradarList = sportradarRes.data?.sports || [];

    // Build maps for easier access
    const betfairMap = {};
    const sportradarMap = {};

    for (const item of betfairResult) {
      const name = item.eventType.name.trim().toLowerCase();
      betfairMap[name] = item;
    }

    for (const sr of sportradarList) {
      const name = sr.sportName.trim().toLowerCase();
      sportradarMap[name] = sr;
    }

    // Merge keys from both sources
    const allSportNames = new Set([...Object.keys(betfairMap), ...Object.keys(sportradarMap)]);

    let last = await Sport.findOne().sort('-position').select('position');
    let nextPosition = last?.position ? last.position + 1 : 1;

    for (const sportKey of allSportNames) {
      const name = sportKey.charAt(0).toUpperCase() + sportKey.slice(1); // Capitalize first letter
      const betfairItem = betfairMap[sportKey] || null;
      const sportradarItem = sportradarMap[sportKey] || null;

      const existingSport = await Sport.findOne({ sportName: new RegExp(`^${name}$`, 'i') });

      if (existingSport) {
        // Update
        existingSport.betfairSportList = betfairItem;
        existingSport.sportradarSportList = sportradarItem;
        existingSport.timestamp = new Date();
        existingSport.status = 1;
        await existingSport.save();
      } else {
        // Create
        const newSport = new Sport({
          sportName: name,
          position: nextPosition++,
          betfairSportList: betfairItem
          ? {
              isFound: 1,
              message: "Sport found from Betfair",
              ...betfairItem
            }
          : {
            isFound: 0,
              message: "No sport found from Betfair"
            },
        
        sportradarSportList: sportradarItem
          ? {
            isFound: 1,
            message: "Sport found from Sportradar",
              ...sportradarItem
            }
          : {
            isFound: 0,
            message: "No sport found from Sportradar"
            },
          isBettingEnabled: false,
          status: 1
        });
        await newSport.save();
      }
    }

    return res.status(200).json({
      message: 'All sports from Betfair and Sportradar synced successfully.'
    });

  } catch (error) {
    console.error('Sync error:', error.message);
    return res.status(500).json({
      message: 'Failed to sync sports',
      error: error.response?.data || error.message
    });
  }
};


exports.getEventsList = async (req, res) => {
  const betfairAppKey = 'fslpapQyGZSmkZW3';
  const betfairSessionToken = 'FnY1o16yM53LM7dYWk6aE1oD4RuzoReewegst5yJtbk=';
  const betfairUrl = 'https://api.betfair.com/exchange/betting/json-rpc/v1';
  const axios = require('axios');

  try {
    const allSports = await Sport.find({ betfairSportList: { $ne: null } });

    for (const sport of allSports) {
      const eventTypeId = sport.betfairSportList?.eventType?.id;
      if (!eventTypeId) continue;

      const headers = {
        'X-Application': betfairAppKey,
        'X-Authentication': betfairSessionToken,
        'Content-Type': 'application/json',
      };

      // STEP 1: Fetch Events
      const eventPayload = [{
        jsonrpc: '2.0',
        method: 'SportsAPING/v1.0/listEvents',
        params: {
          filter: {
            eventTypeIds: [eventTypeId],
            marketStartTime: { from: new Date().toISOString() }
          }
        },
        id: 1
      }];

      let eventList = [];
      let isFound = 0;
      let message = 'No event found from Betfair';

      try {
        const eventRes = await axios.post(betfairUrl, eventPayload, { headers });
        eventList = eventRes.data[0]?.result || [];
        if (eventList.length > 0) {
          isFound = 1;
          message = 'Events fetched successfully';
        }
      } catch (error) {
        console.error('Error fetching events:', error.message);
      }

      // STEP 2: Fetch Competitions
      const competitionPayload = [{
        jsonrpc: '2.0',
        method: 'SportsAPING/v1.0/listCompetitions',
        params: { filter: { eventTypeIds: [eventTypeId] } },
        id: 2
      }];

      let competitionMap = {};
      try {
        const compRes = await axios.post(betfairUrl, competitionPayload, { headers });
        const competitions = compRes.data[0]?.result || [];
        competitions.forEach(c => {
          competitionMap[c.competition.id] = c.competition.name;
        });
      } catch (err) {
        console.error('Error fetching competitions:', err.message);
      }

      // STEP 3: Enrich Events
      const enrichedEvents = [];

      for (const ev of eventList) {
        const event = ev.event;
        let marketCatalogue = null;
        let marketOdds = null;

        try {
          // Fetch marketCatalogue
          const marketPayload = [{
            jsonrpc: '2.0',
            method: 'SportsAPING/v1.0/listMarketCatalogue',
            params: {
              filter: {
                eventIds: [event.id],
                marketTypeCodes: ['MATCH_ODDS']
              },
              maxResults: '1',
              marketProjection: ['COMPETITION']
            },
            id: 3
          }];
          const marketRes = await axios.post(betfairUrl, marketPayload, { headers });
          const catalogueResult = marketRes.data[0]?.result || [];

          if (catalogueResult.length > 0) {
            marketCatalogue = catalogueResult[0];

            // Fetch odds for the market
            const oddsPayload = [{
              jsonrpc: '2.0',
              method: 'SportsAPING/v1.0/listMarketBook',
              params: {
                marketIds: [marketCatalogue.marketId],
                priceProjection: {
                  priceData: ['EX_BEST_OFFERS']
                }
              },
              id: 4
            }];
            const oddsRes = await axios.post(betfairUrl, oddsPayload, { headers });
            const oddsResult = oddsRes.data[0]?.result || [];

            if (oddsResult.length > 0) {
              marketOdds = oddsResult[0];
            }
          }
        } catch (err) {
          console.error(`Market data fetch failed for event ${event.id}:`, err.message);
        }

        // Build enriched event object
        enrichedEvents.push({
          sportId:eventTypeId || 0,
          event_id: event.id,
          name: event.name,
          event_date: event.openDate,
          timezone: event.timezone || null,
          countryCode: event.countryCode || null,
          competition: Array.isArray(marketCatalogue)
            ? marketCatalogue[0]?.competition || 0
            : marketCatalogue?.competition || 0,
            marketOdds
        });
      }

      // STEP 4: Save to DB
      const existing = await EventList.findOne({ sportId: sport._id });

      const eventData = {
        isFound,
        message,
        events: enrichedEvents
      };

      if (existing) {
        existing.betfairEventList = eventData;
        existing.timestamp = new Date();
        await existing.save();
      } else {
        const newEventList = new EventList({
          FastoddsId: sport._id,
          betfairEventList: eventData,
          sportradarEventList: {
            isFound: 0,
            message: 'Sportradar events not fetched yet',
            events: []
          },
          status: 1
        });
        await newEventList.save();
      }
    }

    return res.status(200).json({ message: 'Betfair event list synced successfully for all sports.' });

  } catch (error) {
    console.error('Event sync error:', error.message);
    return res.status(500).json({
      message: 'Failed to sync Betfair events',
      error: error.response?.data || error.message
    });
  }
};


