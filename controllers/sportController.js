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

  const sportradarUrl = 'https://scatalog.mysportsfeed.io/api/v1/core/getsports';
  const sportradarPayload = {
    operatorId: 'laser247',
    providerId: 'SportRadar',
    token: 'c0e509b0-6bc1-4132-80cb-71b54345af12'
  };

  try {
    // Fetch Betfair
    const betfairResponse = await axios.post(betfairUrl, betfairPayload, { headers: betfairHeaders });
    const betfairResult = betfairResponse.data[0]?.result || [];

    // Fetch Sportradar
    const sportradarResponse = await axios.post(sportradarUrl, sportradarPayload);
    const sportradarList = sportradarResponse.data?.sports || [];

    // Map for quick match
    const betfairMap = {};
    const sportradarMap = {};

    for (const item of betfairResult) {
      betfairMap[item.eventType.name.toLowerCase()] = item;
    }

    for (const sr of sportradarList) {
      sportradarMap[sr.sportName.toLowerCase()] = sr;
    }

    // Start with the highest position
    let last = await Sport.findOne().sort('-position').select('position');
    let nextPosition = last?.position ? last.position + 1 : 1;

    // All unique sport names from both APIs
    const uniqueNames = new Set([
      ...Object.keys(betfairMap),
      ...Object.keys(sportradarMap)
    ]);

    for (const sportKey of uniqueNames) {
      const betfairItem = betfairMap[sportKey];
      const sportradarItem = sportradarMap[sportKey];

      const sportName = betfairItem?.eventType?.name || sportradarItem?.sportName || 'Unknown';

      const betfairEventType = betfairItem?.eventType || { id: "0", name: sportName };
      const betfairSportList = {
        eventType: {
          id: betfairEventType.id || "0",
          name: betfairEventType.name || sportName
        },
        marketCount: betfairItem?.marketCount || 0
      };

      const sportradarSportList = sportradarItem || { sportName: sportName, sportId: "0", status: "UNKNOWN" };

      // Check existing sport
      const existing = await Sport.findOne({ sportName });

      if (existing) {
        existing.betfairSportList = betfairSportList;
        existing.sportradarSportList = sportradarSportList;
        existing.timestamp = new Date();
        existing.status = 1;
        await existing.save();
      } else {
        const newSport = new Sport({
          sportName,
          sportId: Math.floor(100000 + Math.random() * 900000),
          position: nextPosition++,
          betfairSportList,
          sportradarSportList,
          isBettingEnabled: false,
          status: 1
        });
        await newSport.save();
      }
    }

    return res.status(200).json({
      message: 'Sports synced from Betfair and Sportradar successfully',
      total: uniqueNames.size
    });

  } catch (error) {
    console.error('Sync error:', error.message);
    return res.status(500).json({
      message: 'Failed to sync sports from Betfair and Sportradar',
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


