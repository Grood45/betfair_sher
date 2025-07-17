const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

  
// curl -k -X POST https://identitysso.betfair.com/api/login \
//   -H "Content-Type: application/x-www-form-urlencoded" \
//   -H "Accept: application/json" \
//   -H "X-Application: fslpapQyGZSmkZW3" \
//   -d "username=Sher951999@gmail.com&password=Sher@786@786"


exports.sportList = async (req, res) => {
  const betfairAppKey = 'fslpapQyGZSmkZW3';
  const betfairSessionToken = 'nPScA9u3FW4UcPTzKZxuO2XQjuLyFfvVwdP7hVbwduw=';
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
          sportId: Math.floor(100000 + Math.random() * 900000),
          position: nextPosition++,
          betfairSportList: betfairItem,
          sportradarSportList: sportradarItem,
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


