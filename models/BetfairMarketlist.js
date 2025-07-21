const mongoose = require('mongoose');

const betfairMarketlistSchema = new mongoose.Schema({
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
  marketList: {
    type: Object, // Or [Object] if storing an array of markets
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BetfairMarketlist', betfairMarketlistSchema);
