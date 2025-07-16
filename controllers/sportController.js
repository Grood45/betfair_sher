const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const axios = require('axios');

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

  const payload = [
    {
      jsonrpc: '2.0',
      method: 'SportsAPING/v1.0/listEventTypes',
      params: { filter: {} },
      id: 1
    }
  ];

  try {
    const response = await axios.post(url, payload, { headers });
    const result = response.data[0]?.result || [];
    console.log(response);

    const eventTypes = result.map(item => ({
      id: item.eventType.id,
      name: item.eventType.name,
      marketCount: item.marketCount
    }));

    return res.status(200).json({
      message: 'Event types fetched successfully',
      eventTypes
    });
  } catch (error) {
    console.error('Betfair API error:', error.message);
    return res.status(500).json({
      message: 'Failed to fetch event types from Betfair',
      error: error.response?.data || error.message
    });
  }
};
