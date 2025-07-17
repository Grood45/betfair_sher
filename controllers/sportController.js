const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');

  

exports.sportList = async (req, res) => {
  const appKey = 'fslpapQyGZSmkZW3';
  const sessionToken = 'UAieWoWy1voS1fqhg/r//VKstS7lul6+j7fS7GODp6M=';

  const url = 'https://api.betfair.com/exchange/betting/json-rpc/v1';
  const headers = {
    'X-Application': appKey,
    'X-Authentication': sessionToken,
    'Content-Type': 'application/json'
  };
  const payload = [{
    jsonrpc: '2.0',
    method: 'SportsAPING/v1.0/listEventTypes',
    params: { filter: {} },
    id: 1
  }];

  try {
    // Betfair Sports
    const response = await axios.post(url, payload, { headers });
    const betfairSports = response.data[0]?.result || [];

    // Sportradar Sports (Mocked list, replace with your own fetch logic)
    const sportradarSports = [
      { name: 'Soccer', id: 'sr:sport:1' },
      { name: 'Tennis', id: 'sr:sport:2' },
      { name: 'Cricket', id: 'sr:sport:3' },
      { name: 'Basketball', id: 'sr:sport:4' },
      // Add more as per your actual data
    ];

    const allNamesSet = new Set();

    // Collect all unique sport names from both
    betfairSports.forEach(item => allNamesSet.add(item.eventType.name));
    sportradarSports.forEach(item => allNamesSet.add(item.name));

    let last = await Sport.findOne().sort('-position').select('position');
    let nextPosition = last?.position ? last.position + 1 : 1;

    for (const name of allNamesSet) {
      const bf = betfairSports.find(b => b.eventType.name === name);
      const sr = sportradarSports.find(s => s.name === name);

      const existing = await Sport.findOne({ sportName: name });

      if (existing) {
        existing.betfairSportList = bf || { eventType: { id: "0", name }, marketCount: 0 };
        existing.sportradarSportList = sr || { id: "0", name };
        existing.timestamp = new Date();
        existing.status = 1;
        await existing.save();
      } else {
        const newSport = new Sport({
          sportName: name,
          position: nextPosition++,
          betfairSportList: bf || { eventType: { id: "0", name }, marketCount: 0 },
          sportradarSportList: sr || { id: "0", name },
          isBettingEnabled: false,
          status: 1
        });
        await newSport.save();
      }
    }

    const totalCount = await Sport.countDocuments();

    return res.status(200).json({
      message: `Synced successfully. Total sports: ${totalCount}`
    });

  } catch (error) {
    console.error('Error:', error.message);
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


