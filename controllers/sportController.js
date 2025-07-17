const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');


exports.sportList = async (req, res) => {
  const betfairAppKey = 'fslpapQyGZSmkZW3';
  const betfairSessionToken = 'UAieWoWy1voS1fqhg/r//VKstS7lul6+j7fS7GODp6M=';

  const betfairUrl = 'https://api.betfair.com/exchange/betting/json-rpc/v1';
  const sportradarUrl = 'https://scatalog.mysportsfeed.io/api/v1/core/getsports';

  const betfairHeaders = {
    'X-Application': betfairAppKey,
    'X-Authentication': betfairSessionToken,
    'Content-Type': 'application/json'
  };

  const betfairPayload = [
    {
      jsonrpc: '2.0',
      method: 'SportsAPING/v1.0/listEventTypes',
      params: { filter: {} },
      id: 1
    }
  ];

  const sportradarPayload = {
    operatorId: 'laser247',
    providerId: 'SportRadar',
    token: 'c0e509b0-6bc1-4132-80cb-71b54345af12'
  };

  try {
    // Fetch data from both sources
    const [betfairRes, sportradarRes] = await Promise.all([
      axios.post(betfairUrl, betfairPayload, { headers: betfairHeaders }),
      axios.post(sportradarUrl, sportradarPayload)
    ]);

    const betfairList = betfairRes.data[0]?.result || [];
    const sportradarList = sportradarRes.data?.sports || [];

    // Build map for fast Sportradar lookup
    const sportradarMap = {};
    for (const sr of sportradarList) {
      sportradarMap[sr.sportName.toLowerCase()] = sr;
    }

    // Keep track of matched Sportradar names
    const matchedSportradarNames = new Set();

    // Get next position
    let last = await Sport.findOne().sort('-position').select('position');
    let nextPosition = last?.position ? last.position + 1 : 1;

    // 🔁 Process Betfair sports
    for (const item of betfairList) {
      const { name } = item.eventType;
      const lowerName = name.toLowerCase();

      let matchedSR = sportradarMap[lowerName];
      let isMatched = true;

      if (!matchedSR) {
        matchedSR = { sportId: "0" }; // no match found
        isMatched = false;
      } else {
        matchedSportradarNames.add(lowerName);
      }

      const existing = await Sport.findOne({ sportName: name });
      if (existing) {
        existing.betfairSportList = item;
        existing.sportradarSportList = matchedSR;
        existing.timestamp = new Date();
        existing.status = 1;
        await existing.save();
      } else {
        const newSport = new Sport({
          sportName: name,
          sportId: Math.floor(100000 + Math.random() * 900000),
          position: nextPosition++,
          betfairSportList: item,
          sportradarSportList: matchedSR,
          isBettingEnabled: false,
          status: 1,
          matchedFrom: isMatched ? 'both' : 'betfair',
          timestamp: new Date()
        });
        await newSport.save();
      }
    }

    // 🔁 Process unmatched Sportradar sports
    for (const sr of sportradarList) {
      const nameLower = sr.sportName.toLowerCase();

      if (!matchedSportradarNames.has(nameLower)) {
        const exists = await Sport.findOne({ sportName: sr.sportName });
        if (!exists) {
          const newSportradarOnly = new Sport({
            sportName: sr.sportName,
            sportId: Math.floor(100000 + Math.random() * 900000),
            position: nextPosition++,
            betfairSportList: null,
            sportradarSportList: sr,
            isBettingEnabled: false,
            status: 1,
            timestamp: new Date()
          });
          await newSportradarOnly.save();
        }
      }
    }

    return res.status(200).json({
      message: '✅ All sports synced successfully: Betfair matched/unmatched + Sportradar unmatched.'
    });

  } catch (error) {
    console.error('❌ Sync error:', error.message);
    return res.status(500).json({
      message: 'Failed to sync sports',
      error: error.response?.data || error.message
    });
  }
};


// exports.sportList = async (req, res) => {
//   const appKey = 'fslpapQyGZSmkZW3';
//   const sessionToken = 'UAieWoWy1voS1fqhg/r//VKstS7lul6+j7fS7GODp6M=';

//   const url = 'https://api.betfair.com/exchange/betting/json-rpc/v1';

//   const headers = {
//     'X-Application': appKey,
//     'X-Authentication': sessionToken,
//     'Content-Type': 'application/json'
//   };

//   const payload = [
//     {
//       jsonrpc: '2.0',
//       method: 'SportsAPING/v1.0/listEventTypes',
//       params: { filter: {} },
//       id: 1
//     }
//   ];

//   try {
//     const response = await axios.post(url, payload, { headers });
//     const result = response.data[0]?.result || [];

//     const eventTypes = [];

//     let last = await Sport.findOne().sort('-position').select('position');
//     let nextPosition = last?.position ? last.position + 1 : 1;

//     for (const item of result) {
//       const { id, name } = item.eventType;
//       const marketCount = item.marketCount;

//       const existingSport = await Sport.findOne({ sportName: name });

//       if (existingSport) {
//         // Update existing record
//         existingSport.betfairSportList = item;
//         existingSport.timestamp = new Date();
//         existingSport.status = 1;
//         await existingSport.save();
//       } else {
//         // Create new record
//         const newSport = new Sport({
//           sportName: name,
//           position: nextPosition++,
//           betfairSportList: item,
//           sportradarSportList: new mongoose.Types.Mixed({}), // placeholder if not available now
//           isBettingEnabled: false,
//           status: 1
//         });
//         await newSport.save();
//       }

//       eventTypes.push({
//         id,
//         name,
//         marketCount
//       });
//     }

//     return res.status(200).json({
//       message: 'Event types fetched and synced successfully'
//     });

//   } catch (error) {
//     console.error('Betfair API error:', error.message);
//     return res.status(500).json({
//       message: 'Failed to fetch event types from Betfair',
//       error: error.response?.data || error.message
//     });
//   }
// };


