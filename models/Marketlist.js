const mongoose = require('mongoose');

const runnerSchema = new mongoose.Schema({
  selectionId: Number,
  runnerName: String,
  handicap: Number,
  sortPriority: Number,
  metadata: {
    runnerId: String
  }
});

const marketListSchema = new mongoose.Schema({
  marketId: { type: String, required: true, unique: true },
  marketName: String,
  marketStartTime: Date,
  totalMatched: Number,
  runners: [runnerSchema],

  eventType: {
    id: String,
    name: String
  },
  competition: {
    id: String,
    name: String
  },
  event: {
    id: String,
    name: String,
    countryCode: String,
    timezone: String,
    openDate: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MarketList', marketListSchema);
