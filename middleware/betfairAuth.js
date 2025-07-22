// middlewares/betfairAuthMiddleware.js

const axios = require('axios');

const betfairAppKey = 'fslpapQyGZSmkZW3';
const betfairUsername = 'Sher951999@gmail.com';
const betfairPassword = 'Sher@786@786';

const getBetfairSessionToken = async () => {
  try {
    const response = await axios.post(
      'https://identitysso.betfair.com/api/login',
      `username=${encodeURIComponent(betfairUsername)}&password=${encodeURIComponent(betfairPassword)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'X-Application': betfairAppKey,
        }
      }
    );

    if (response.data.status === 'SUCCESS') {
      return response.data.token;
    } else {
      throw new Error('Login failed: ' + response.data.error);
    }
  } catch (error) {
    console.error('Error logging in to Betfair:', error.message);
    return null;
  }
};

const betfairAuthMiddleware = async (req, res, next) => {
  const token = await getBetfairSessionToken();
  if (!token) {
    return res.status(500).json({ error: 'Failed to authenticate with Betfair' });
  }

  req.betfairAppKey = betfairAppKey;
  req.betfairSessionToken = token;

  next();
};

module.exports = betfairAuthMiddleware;
