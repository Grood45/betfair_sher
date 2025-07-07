const axios = require('axios');
const Marketlimit = require('../models/Marketlimit');
const MarketList = require('../models/Marketlist');
const ExchangeOdds = require('../models/ExchangeOdds');
const BookmakerMarket = require('../models/BookmakerMarket');
const Fancymarket = require('../models/FancyMarket');

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

    /* -----------------------------------------------------------
     * Fetch both collections in parallel.
     * -----------------------------------------------------------
     */
    const [exchangeOdds, bookmakerMarkets] = await Promise.all([
      ExchangeOdds.find({ eventId }),
      BookmakerMarket.find({ eventId })
    ]);

    if (!exchangeOdds.length && !bookmakerMarkets.length) {
      return res.status(404).json({ message: 'No data found for this eventId' });
    }

    /* -----------------------------------------------------------
     *  Build the payload.
     *  – You can keep them in separate arrays (shown here), or
     *    map bookmaker markets into each odds item if you prefer.
     * -----------------------------------------------------------
     */
    res.status(200).json({
      message          : 'Data fetched successfully',
      totalExchangeOdds: exchangeOdds.length,
      totalBookmakers  : bookmakerMarkets.length,
      data             : {
        exchangeOdds,
        bookmakerMarkets
      }
    });
  } catch (err) {
    console.error('Error fetching data:', err);
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


exports.syncBookmakerMarkets = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required in URL params' });
    }

    const { data } = await axios.get(`https://apidiamond.online/sports/api/v1/exchange/v1/player-operations/fancy/event/details/${eventId}`);

    if (!data || data.status !== 'OK' || !Array.isArray(data.data)) {
      return res.status(400).json({ message: 'Invalid API response', raw: data });
    }

    let inserted = 0;
    let updated = 0;

    for (const entry of data.data) {
      const categoryDetails = entry.categoryDetails;
      const markets = entry.markets;

      for (const market of markets) {
        const filter = { eventId, marketId: market.marketId };

        const updateDoc = {
          eventId,
          marketId: market.marketId,
          eventName: market.eventName,
          competitionId: market.competitionId || '',
          competitionName: market.competitionName || '',
          market,
          categoryDetails,
          feedTimestamp: new Date()
        };

        const existing = await BookmakerMarket.findOne(filter);

        const result = await BookmakerMarket.findOneAndUpdate(
          filter,
          { $set: updateDoc },
          { new: true, upsert: true }
        );

        if (existing) updated++;
        else inserted++;
      }
    }

    res.status(200).json({
      message: 'Bookmaker markets sync completed',
      eventId,
      inserted,
      updated
    });

  } catch (err) {
    console.error('Bookmaker sync error:', err.message);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

exports.syncBmFancyMarkets = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required in URL params' });
    }

    const { data: apiData } = await axios.get(
      `https://apidiamond.online/sports/api/v1/bm_fancy/${eventId}/1`
    );

    /* validate */
    if (!apiData || typeof apiData !== 'object' || !apiData.status || !apiData.data) {
      return res.status(400).json({ message: 'Invalid API response structure', raw: apiData });
    }

    const {
      vid        = eventId,
      updatetime = Date.now(),
      update     = '',
      BMmarket   = { bm1: [] },
      Fancymarket: fancyArr = []
    } = apiData.data;

    const doc = {
      status: apiData.status,
      eventId,
      vid,
      updatetime: new Date(updatetime),
      update,
      BMmarket,
      Fancymarket: fancyArr
    };

    const result = await Fancymarket.findOneAndUpdate(
      { eventId },
      { $set: doc },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: 'BM & Fancy markets synced (flattened)',
      eventId,
      documentId: result._id
    });

  } catch (err) {
    console.error('BM/Fancy sync error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};