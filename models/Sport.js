const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  sportName: {
    type: String,
    required: true
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
