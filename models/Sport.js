const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  sportId: {
    type: Number,
    unique: true,
    required: true
  },
  sportName: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    default: 0
  },
  minBet: {
    type: Number,
    default: 100
  },
  maxBet: {
    type: Number,
    default: 500000
  },

  // Betfair full API data
  betfairSportList: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Sportradar full API data
  sportradarSportList: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  timestamp: {
    type: Date,
    default: Date.now
  },

  isBettingEnabled: {
    type: Boolean,
    default: false
  },

  status: {
    type: Number,
    default: 1
  }

}, { timestamps: true });


module.exports = mongoose.model('Sport', sportSchema);


