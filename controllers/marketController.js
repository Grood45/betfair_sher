const Marketlimit = require('../models/Marketlimit');

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