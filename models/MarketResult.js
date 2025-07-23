const mongoose = require('mongoose');

const RunnerSchema = new mongoose.Schema({
  selectionId: {
    type: Number,
    required: true
  },
  runnerName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['WINNER', 'LOSER', 'REMOVED', 'ACTIVE', 'CLOSED'], // add other statuses as needed
    required: true
  },
  isWinner: {
    type: Boolean,
    default: false
  }
});

const MarketResultSchema = new mongoose.Schema({
  betfair_event_id: String,
  marketId: {
    type: String,
    required: true,
    index: true // optional, for faster querying
  },
  marketName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'SUSPENDED', 'CLOSED'],
    required: true
  },
  runners: [RunnerSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MarketResult', MarketResultSchema);
