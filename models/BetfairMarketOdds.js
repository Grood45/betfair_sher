const mongoose = require('mongoose');

const betfairMarketOddsSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  FastoddsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'FastoddsSport' // Adjust the reference model name if needed
  },
  betfair_event_id: {
    type: String,
    required: true
  },
  marketOdds: {
    type: Object, // Or [Object] if storing an array of markets
    required: true
  }
}, {
  timestamps: true,strict:false
});

module.exports = mongoose.model('BetfairMarketOdds', betfairMarketOddsSchema);
