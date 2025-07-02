const axios = require('axios');
const Marketlimit = require('../models/Marketlimit');
const MarketList = require('../models/Marketlist');
const ExchangeOdds = require('../models/ExchangeOdds');

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


exports.getExchangeOddsByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ message: 'Missing eventId in params' });
    }

    const odds = await ExchangeOdds.find({ eventId });

    if (!odds.length) {
      return res.status(404).json({ message: 'No exchange odds found for this eventId' });
    }

    res.status(200).json({
      message: 'Exchange odds fetched successfully',
      total: odds.length,
      data: odds
    });

  } catch (err) {
    console.error('Error fetching exchange odds:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.syncMarketList = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ message: 'Missing eventId in params' });
    }

    const syncResult = await syncMarketListByEventId(eventId);
    // Step 2: Get only marketIds from DB
    const marketDocs = await MarketList.find(
      { 'event.id': eventId },
      { marketId: 1, _id: 0 }
    );

    const marketIds = marketDocs.map(m => m.marketId).filter(Boolean);

    if (marketIds.length === 0) {
      return res.status(404).json({ message: 'No marketIds found after sync' });
    }

    // Step 3: Make external API call with all marketIds
    const oddsResponse = await axios.get(
      `https://apidiamond.online/sports/api/v1/macthodds/`,
      {
        params: {
          ids: marketIds.join(',')
        }
      }
    );

    const oddsList = oddsResponse.data?.data || [];

    // Step 4: Store odds in DB
    let inserted = 0, updated = 0;

    for (const market of oddsList) {
      const existing = await ExchangeOdds.findOne({ MarketId: market.MarketId });

      await ExchangeOdds.findOneAndUpdate(
        { MarketId: market.MarketId },
        {
          $set: {
            MarketId: market.MarketId,
            eventId: market.eventId,
            marketName: market.marketName,
            Status: market.Status,
            IsInplay: market.IsInplay,
            updateTime: market.updatetime,
            sport: market.sport,
            NumberOfRunners: market.NumberOfRunners,
            NumberOfActiveRunners: market.NumberOfActiveRunners,
            TotalMatched: market.TotalMatched,
            Runners: market.Runners
          }
        },
        { new: true, upsert: true }
      );

      if (existing) updated++;
      else inserted++;
    }

    // Step 5: Respond
    res.status(200).json({
      message: 'Synced, odds fetched and stored',
      syncSummary: syncResult,
      marketIds,
      oddsStored: {
        inserted,
        updated
      }
    });

  } catch (err) {
    console.error('Error fetching market list:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


const syncMarketListByEventId = async (eventId) => {
  if (!eventId) {
    throw new Error('Missing eventId');
  }

  // Call external API
  const response = await axios.post(
    'https://apidiamond.online/sports/api/market-list',
    { eventId }
  );

  const marketDataArray = response.data?.data;

  if (!Array.isArray(marketDataArray)) {
    throw new Error('Invalid market data received');
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

  return { inserted, updated };
};

