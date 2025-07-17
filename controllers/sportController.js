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
    // Step 1: Get Betfair Sports
    const betfairResponse = await axios.post(betfairUrl, betfairPayload, { headers: betfairHeaders });
    const betfairResult = betfairResponse.data[0]?.result || [];

    // Step 2: Get Sportradar Sports
    const sportradarResponse = await axios.post(sportradarUrl, sportradarPayload);
    const sportradarList = sportradarResponse.data?.sports || [];

    // Step 3: Build a map from Sportradar for matching
    const sportradarMap = {};
    for (const sr of sportradarList) {
      sportradarMap[sr.sportName.toLowerCase()] = sr;
    }

    let last = await Sport.findOne().sort('-position').select('position');
    let nextPosition = last?.position ? last.position + 1 : 1;

    const eventTypes = [];

    for (const item of betfairResult) {
      const { id, name } = item.eventType;
      const marketCount = item.marketCount;
    
      // Try to match with Sportradar by name
      const matchedSR = sportradarMap[name.toLowerCase()] || {};
    
      const existingSport = await Sport.findOne({ sportName: name });
    
      if (existingSport) {
        // Update existing
        existingSport.betfairSportList = item ?? {};
        existingSport.sportradarSportList = matchedSR ?? {};
        existingSport.timestamp = new Date();
        existingSport.status = 1;
    
        if (Object.keys(matchedSR).length === 0) {
          existingSport.markModified('sportradarSportList');
        }
    
        await existingSport.save();
      } else {
        // Create new
        const newSport = new Sport({
          sportName: name,
          position: nextPosition++,
          betfairSportList: item ?? {},
          sportradarSportList: matchedSR ?? {},
          isBettingEnabled: false,
          status: 1
        });
    
        if (Object.keys(matchedSR).length === 0) {
          newSport.markModified('sportradarSportList');
        }
    
        await newSport.save();
      }
    }
    

    return res.status(200).json({
      message: 'Event types synced with Betfair and Sportradar successfully'
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


