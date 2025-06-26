const mongoose = require('mongoose');

const marketLimitSchema = new mongoose.Schema({
  marketType: { type: String, enum: ['Match Odds', 'Bookmaker', 'Fancy', 'Other'], required: true, unique: true },
  minBet: { type: Number, required: true },
  maxBet: { type: Number, required: true },
  maxProfit: { type: Number, required: true }
});

module.exports = mongoose.model('MarketLimit', marketLimitSchema);
