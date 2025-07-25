const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const EventList = require('../models/EventList'); 
const SpotRadarEvent = require('../models/SpotRadarEvent');
const BetfairMarketlist = require('../models/BetfairMarketlist');
const BetfairMarketOdds = require('../models/BetfairMarketOdds');
const mongoose = require('mongoose');
const BetfairMarketResult = require('../models/MarketResult');


exports.fetchAndStoreSportradarEvents = async (req, res) => {
  try {
    const token = 'ca5822fe-b4f8-4251-b72d-b3b4bfe4b133'; // move to env in prod
    const sports = await Sport.find({}); // Get all sports

    for (const sport of sports) {
      const sportId = sport?.sportradarSportList?.sportId;
      const FastoddsId = sport?._id;

      if (!sportId || !FastoddsId) continue;

      let combinedEvents = [];

      for (const isInplay of [true, false]) {
        // Step 1: Get count for inplay or pre-match
        const countResponse = await axios.post(
          'https://scatalog.mysportsfeed.io/api/v1/core/sr-events-count',
          {
            operatorId: '99hub',
            providerId: 'sportsbook',
            partnerId: 'HBPID01',
            isInplay,
            sportId,
            token
          }
        );

        const item = countResponse?.data?.itemsCount?.find(i => i.sportId === sportId);
        const eventCount = item?.total || 0;
        const totalPages = Math.ceil(eventCount / 20);

        console.log(`Sport: ${sportId} | Inplay: ${isInplay} | Total Events: ${eventCount} | Pages: ${totalPages}`);

        for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
          const eventResponse = await axios.post(
            'https://scatalog.mysportsfeed.io/api/v2/core/getevents',
            {
              operatorId: '99hub',
              providerId: 'sportsbook',
              partnerId: 'HBPID01',
              sportId,
              token,
              isInplay,
              pageNo
            }
          );

          const events = eventResponse?.data?.sports || [];
          console.log(`Fetched ${events.length} events (inplay: ${isInplay}) from page ${pageNo}`);

          if (events.length === 0) break;

          // Optionally tag each event with isInplay flag
          const taggedEvents = events.map(e => ({ ...e, isInplay }));
          combinedEvents.push(...taggedEvents);
        }
      }

      // Save combined events
      await SpotRadarEvent.findOneAndUpdate(
        { FastoddsId },
        {
          radarSportId: sportId,
          spotradardeventlist: combinedEvents
        },
        { upsert: true, new: true }
      );

      console.log(`Saved ${combinedEvents.length} total events for sportId ${sportId}`);
    }

    res.status(200).json({ message: 'Sportradar events (inplay & non-inplay) fetched and stored successfully.' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};



exports.sportList = async (req, res) => {
  const betfairAppKey = req.betfairAppKey;
  const betfairSessionToken = req.betfairSessionToken;
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
  const betfairAppKey = req.betfairAppKey;
  const betfairSessionToken = req.betfairSessionToken;
  const betfairUrl = 'https://api.betfair.com/exchange/betting/json-rpc/v1';
  const axios = require('axios');

  try {
    // const allSports = await Sport.find({ betfairSportList: { $ne: null } });
    const allSports = await Sport.find({
      betfairSportList: { $ne: null },
      sportName: "Tennis"
    });


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
        console.log("eventRes===>",eventRes);

        eventList = eventRes.data[0]?.result || [];
        if (eventList.length > 0) {
          isFound = 1;
          message = 'Events fetched successfully';
          console.log("eventList===>",eventList);
          
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


exports.fetchAndStoreBetfairMarkets = async (req, res) => {
  try {
    const betfairAppKey = req.betfairAppKey;
    const betfairSessionToken = req.betfairSessionToken;

    const allEvents = await EventList.find({});

    for (const event of allEvents) {
      const FastoddsId = event.FastoddsId;
      const rawBetfairEventList = event.betfairEventList;

      // Normalize betfairEventList to array
      let betfairEventLists = [];
      if (Array.isArray(rawBetfairEventList)) {
        betfairEventLists = rawBetfairEventList;
      } else if (typeof rawBetfairEventList === 'object' && rawBetfairEventList !== null) {
        betfairEventLists = [rawBetfairEventList];
      } else {
        console.warn(`⚠️ Skipping: Invalid betfairEventList for FastoddsId: ${FastoddsId}`);
        continue;
      }

      for (const betfairItem of betfairEventLists) {
        const eventObjects = Array.isArray(betfairItem.events) ? betfairItem.events : [];

        for (const ev of eventObjects) {
          const betfair_event_id = ev?.event_id;
          if (!betfair_event_id) continue;

          console.log(`➡️ Processing Event ID: ${betfair_event_id} (FastoddsId: ${FastoddsId})`);

          try {
            // Fetch market data from Betfair
            const response = await axios.post(
              'https://api.betfair.com/exchange/betting/json-rpc/v1',
              [
                {
                  jsonrpc: '2.0',
                  method: 'SportsAPING/v1.0/listMarketCatalogue',
                  params: {
                    filter: { eventIds: [betfair_event_id] },
                    maxResults: '100',
                    marketProjection: ['MARKET_START_TIME', 'RUNNER_DESCRIPTION']
                  },
                  id: 1
                }
              ],
              {
                headers: {
                  'X-Application': betfairAppKey,
                  'X-Authentication': betfairSessionToken,
                  'Content-Type': 'application/json'
                }
              }
            );

            const marketList = response?.data?.[0]?.result || [];

            if (marketList.length > 0) {
              // Save to DB
              await BetfairMarketlist.findOneAndUpdate(
                { betfair_event_id },
                {
                  $set: {
                    FastoddsId,
                    betfair_event_id,
                    marketList
                  }
                },
                { upsert: true, new: true }
              );
              console.log(`✅ Saved ${marketList.length} markets for event ${betfair_event_id}`);
            } else {
              console.warn(`⚠️ No market data for event ${betfair_event_id}`);
            }
          } catch (apiError) {
            console.error(`❌ API/DB error for event ${betfair_event_id}:`, apiError.message);
          }
        }
      }
    }

    res.status(200).json({ message: 'Betfair market data stored successfully' });
  } catch (error) {
    console.error('❌ Error fetching/storing betfair markets:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.getBetfairMarketResultsByEvent = async (req, res) => {
  const betfairAppKey = req.betfairAppKey;
  const betfairSessionToken = req.betfairSessionToken;
  console.log('Using AppKey:', betfairAppKey);
  console.log('Using SessionToken:', betfairSessionToken);

  try {
    // Step 1: Fetch all market list records
    const allMarketRecords = await BetfairMarketlist.find({});
    if (!allMarketRecords || allMarketRecords.length === 0) {
      console.log('No market records found in DB');
      return res.status(400).json({ message: 'No market records found' });
    }

    // Step 2: Extract all marketIds
    const allMarketIds = allMarketRecords.flatMap(record =>
      record.marketList.map(m => m.marketId)
    );
    if (allMarketIds.length === 0) {
      console.log('No marketIds found in records');
      return res.status(400).json({ message: 'No marketIds found' });
    }

    // Helper: Chunk array into 20-marketId pieces
    const chunkArray = (arr, size) => {
      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    };

    const chunks = chunkArray(allMarketIds, 30);
    let allResults = [];

    for (const chunk of chunks) {
      console.log(`Fetching market book for chunk: ${chunk.join(',')}`);

      const response = await axios.post(
        'https://api.betfair.com/exchange/betting/json-rpc/v1',
        [
          {
            jsonrpc: '2.0',
            method: 'SportsAPING/v1.0/listMarketBook',
            params: {
              marketIds: chunk,
              priceProjection: {
                priceData: ['EX_BEST_OFFERS'],
                virtualise: true,
                rolloverStakes: true
              }
            },
            id: 1
          }
        ],
        {
          headers: {
            'X-Application': betfairAppKey,
            'X-Authentication': betfairSessionToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(JSON.stringify(response.data));
      const results = response.data[0]?.result || [];
      console.log(`Received ${results.length} results from Betfair API`);
      allResults.push(...results);

      // Save each market result
      for (const market of results) {
        const marketId = market.marketId;

        // Try to map back to eventId (if available)
        const record = allMarketRecords.find(record =>
          record.marketList.some(m => m.marketId === marketId)
        );
        const eventId = record?.betfair_event_id || null;

        const marketResult = {
          eventId,
          betfair_event_id: eventId,
          marketId: market.marketId,
          marketName: market.marketName || 'Match Odds',
          status: market.status,
          runners: market.runners?.map(r => ({
            selectionId: r.selectionId,
            runnerName: '', // Not available in listMarketBook
            status: r.status,
            isWinner: r.status === 'WINNER'
          }))
        };

        console.log(`Saving market result for marketId: ${market.marketId}, eventId: ${eventId}`);

        await BetfairMarketResult.findOneAndUpdate(
          { marketId: market.marketId },
          marketResult,
          { upsert: true, new: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'All market results fetched and saved',
      data: allResults
    });

  } catch (error) {
    console.error('Error fetching/saving market results:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      data: error.response?.data || null
    });
  }
};





exports.fetchAndStoreBetfairMarketsOdds = async (req, res) => {
  try {
    // Step 1: Fetch marketList from DB
    const marketDocs = await BetfairMarketlist.find({});

    const allMarkets = marketDocs.flatMap(doc =>
      doc.marketList.map(market => ({
        marketId: market.marketId,
        fastOddsId: doc.FastoddsId,
        betfair_event_id: doc.betfair_event_id
      }))
    );

    // Chunk marketIds to max 10
    const chunkSize = 60;
    const chunks = [];
    for (let i = 0; i < allMarkets.length; i += chunkSize) {
      chunks.push(allMarkets.slice(i, i + chunkSize));
    }

    const allEnrichedResults = [];

    for (const chunk of chunks) {
      const marketIdsCsv = chunk.map(m => m.marketId).join(',');

      console.log(`Fetching odds for: ${marketIdsCsv}`);

      const oddsRes = await axios.post(
        'https://exchmarket.net/exchangeapi/sports/directmarketsbook',
        JSON.stringify(marketIdsCsv),
        {
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(marketIdsCsv))
          }
        }
      );

    
      const responseArray = oddsRes.data || [];

      // Enrich with fastOddsId and eventId
      const enrichedResult = responseArray.map(item => {
        const match = chunk.find(m => m.marketId === item.marketId);
        return {
          fastOddsId: match?.fastOddsId || null,
          betfair_event_id: match?.betfair_event_id || null,
          marketOdds:item
        };
      });

      // Save or update each enriched result
      for (const data of enrichedResult) {
        await BetfairMarketOdds.findOneAndUpdate(
          { betfair_event_id: data.betfair_event_id },
          {
            $set: { fastOddsId: data.fastOddsId },
            $push: { marketOdds: data.marketOdds }
          },
          { upsert: true, new: true }
        );
        console.log(`Saved/Updated odds for eventId: ${data.betfair_event_id}`);
      }

      allEnrichedResults.push(...enrichedResult);
    }

    return res.status(200).json({
      status: 1,
      message: 'Odds data saved successfully.',
      result: allEnrichedResults
    });

  } catch (error) {
    console.error('Error in fetchAndStoreBetfairMarketsOdds:', error.message);
    return res.status(500).json({
      status: 0,
      message: 'Internal Server Error',
      error: error
    });
  }
};