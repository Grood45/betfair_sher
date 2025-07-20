const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const EventList = require('../models/EventList'); 
const SpotRadarEvent = require('../models/SpotRadarEvent');





exports.fetchAndStoreSportradarEvents = async (req, res) => {
  try {
    const token = 'ca5822fe-b4f8-4251-b72d-b3b4bfe4b133'; // move to env in prod

    const sports = await Sport.find({}); // Get all sports

    for (const sport of sports) {
      const sportId = sport?.sportradarSportList?.sportId;
      const FastoddsId = sport?._id;

      if (!sportId || !FastoddsId) continue;

      // Step 1: Get total count
      const countResponse = await axios.post(
        'https://scatalog.mysportsfeed.io/api/v1/core/sr-events-count',
        {
          operatorId: '99hub',
          providerId: 'sportsbook',
          partnerId: 'HBPID01',
          isInplay: true,
          sportId,
          token
        }
      );

      const item = countResponse?.data?.itemsCount?.find(
        (i) => i.sportId === sportId
      );

      const eventCount = item?.total || 0;
      const totalPages = Math.ceil(eventCount / 20);

      console.log(`Sport: ${sportId} | Total Events: ${eventCount} | Pages: ${totalPages}`);

      let allEvents = [];

      // Step 2: Loop through pages
      for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
        const eventResponse = await axios.post(
          'https://scatalog.mysportsfeed.io/api/v2/core/getevents',
          {
            operatorId: '99hub',
            providerId: 'sportsbook',
            partnerId: 'HBPID01',
            sportId,
            token,
            isInplay: true,
            pageNo
          }
        );

        const events = eventResponse?.data?.sports || [];
        console.log(`Fetched ${events.length} events from page ${pageNo} for sport ${sportId}`);
        if (events.length === 0) {
          console.warn(`No events found on page ${pageNo}. Breaking...`);
          break;
        }
        allEvents.push(...events);
      }

      // Step 3: Save to DB
      await SpotRadarEvent.findOneAndUpdate(
        { FastoddsId },
        { 
          radarSportId: sportId,
          spotradardeventlist: allEvents
         },
        { upsert: true, new: true }
      );

      console.log(`Saved ${allEvents.length} events for sport ${sportId} in DB.`);
    }

    res.status(200).json({ message: 'Sportradar events fetched and stored successfully.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


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


        let cleanedMarketOdds = 0;

        if (Array.isArray(marketOdds)) {
          const odds = marketOdds[0];
          cleanedMarketOdds = {
            marketId: odds?.marketId || '',
            status: odds?.status || '',
            totalMatched: odds?.totalMatched || 0,
            runners: Array.isArray(odds.runners) ? odds.runners : []
          };
        } else if (typeof marketOdds === 'object' && marketOdds !== null) {
          cleanedMarketOdds = {
            marketId: marketOdds.marketId || '',
            status: marketOdds.status || '',
            totalMatched: marketOdds.totalMatched || 0,
            runners: Array.isArray(marketOdds.runners) ? marketOdds.runners : []
          };
        } else {
          cleanedMarketOdds = 0;
        }
        // Build enriched event object
        enrichedEvents.push({
          sportId:eventTypeId || 0,
          event_id: event.id,
          name: event.name,
          event_date: event.openDate,
          timezone: event.timezone || null,
          countryCode: event.countryCode || null,
          isinplay: (event.inPlay === true || new Date(event.openDate) <= new Date()) ? "true" : "false",
          isFancy: "",
          isBM: "",
          isPremium: "",
          score: true,
          tv: false,
          total_matched: Array.isArray(marketCatalogue)
          ? marketCatalogue[0]?.totalMatched || 0
          : marketCatalogue?.totalMatched || 0,
          position: 1,
          market_count: 3,
          competition: Array.isArray(marketCatalogue)
            ? marketCatalogue[0]?.competition || 0
            : marketCatalogue?.competition || 0,
            marketOdds:cleanedMarketOdds
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


