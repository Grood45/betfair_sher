const axios = require('axios');
const Marketlimit = require('../models/Marketlimit');
const MarketList = require('../models/Marketlist');

exports.getAllLimits = async (req, res) => {
  try {
    const limits = await Marketlimit.find().sort({ marketType: 1 });
    res.status(200).json({ message: 'Market limits fetched successfully', data: limits });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch market limits', error: err.message });
  }
};

// ✅ CREATE or UPDATE a market limit
exports.createOrUpdateLimit = async (req, res) => {
  try {
    const { marketType, minBet, maxBet, maxProfit } = req.body;

    if (!marketType || !minBet || !maxBet || !maxProfit) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const updated = await Marketlimit.findOneAndUpdate(
      { marketType },
      { minBet, maxBet, maxProfit },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Market limit saved successfully', data: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save market limit', error: err.message });
  }
};


exports.syncMarketList = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ message: 'Missing eventId in query params' });
    }

    // Make POST request with eventId in body
    const response = await axios.post(
      'https://apidiamond.online/sports/api/market-list',
      { eventId }  // sending eventId in POST body
    );

    const marketDataArray = response.data?.data;

    if (!Array.isArray(marketDataArray)) {
      return res.status(400).json({ message: 'Invalid market data received' });
    }

    let inserted = 0;
    let updated = 0;

    for (const market of marketDataArray) {
      const existing = await MarketList.findOne({ marketId: market.marketId });

      await MarketList.findOneAndUpdate(
        { marketId: market.marketId },
        { $set: market },
        { new: true, upsert: true }
      );

      if (existing) updated++;
      else inserted++;
    }

    res.status(200).json({
      message: 'Market sync completed',
      inserted,
      updated
    });

  } catch (err) {
    console.error('Error syncing markets:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
