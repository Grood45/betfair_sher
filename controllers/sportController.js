const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');
const Sport = require('../models/Sport');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const EventList = require('../models/EventList'); 
  
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
  const betfairSessionToken = 'nPScA9u3FW4UcPTzKZxuO2XQjuLyFfvVwdP7hVbwduw=';
  const betfairUrl = 'https://api.betfair.com/exchange/betting/json-rpc/v1';

  try {
    const allSports = await Sport.find({ betfairSportList: { $ne: null } });

    for (const sport of allSports) {
      const eventTypeId = sport.betfairSportList?.eventType?.id;
      if (!eventTypeId) continue;

      const betfairPayload = [{
        jsonrpc: '2.0',
        method: 'SportsAPING/v1.0/listEvents',
        params: {
          filter: {
            eventTypeIds: [eventTypeId],
            marketStartTime: {} // Empty as per your curl
          }
        },
        id: 1
      }];

      const headers = {
        'X-Application': betfairAppKey,
        'X-Authentication': betfairSessionToken,
        'Content-Type': 'application/json'
      };

      let betfairResult = [];
      let message = 'No event found from Betfair';
      let isFound = 0;

      try {
        const response = await axios.post(betfairUrl, betfairPayload, { headers });
        betfairResult = response.data[0]?.result || [];
        if (betfairResult.length > 0) {
          isFound = 1;
          message = 'Events found from Betfair';
        }
      } catch (err) {
        console.error(`Failed to fetch Betfair events for sport ${sport.sportName}:`, err.message);
      }

      const existing = await EventList.findOne({ sportId: sport._id });

      if (existing) {
        existing.betfairEventList = {
          isFound,
          message,
          result: betfairResult
        };
        existing.timestamp = new Date();
        await existing.save();
      } else {
        const newEventList = new EventList({
          sportId: sport._id,
          betfairEventList: {
            isFound,
            message,
            result: betfairResult
          },
          sportradarEventList: {
            isFound: 0,
            message: 'Sportradar events not fetched yet',
            result: []
          },
          status: 1
        });
        await newEventList.save();
      }
    }

    return res.status(200).json({
      message: 'Betfair event list synced successfully for all sports.'
    });

  } catch (error) {
    console.error('Event sync error:', error.message);
    return res.status(500).json({
      message: 'Failed to sync Betfair events',
      error: error.response?.data || error.message
    });
  }
};
