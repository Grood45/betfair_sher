const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchId: { type: Number, required: true, unique: true },
  league_name: String,
  event_id: { type: Number, unique: true, required: true },
  eventId: { type: Number, unique: true, required: true },
  sport_id: Number,
  league_id: Number,
  event_name: String,
  event_date: Date,
  slug: String,
  has_bookmaker: Number,
  has_fancy: Number,
  has_3rdparty_Bookmaker: Number,
  has_3rdparty_Fancy: Number,
  has_premium_fancy: Number,
  is_custom: Number,
  is_populer: Number,
  has_pool: Number,
  is_exclusive: Number,
  accept_any_odds: Number,
  min_stake: Number,
  max_stake: Number,
  max_market_limit: Number,
  odd_limit: Number,
  bet_delay: Number,
  market_internal_id: Number,
  isMatchLive: Boolean,
  sport_name: String,
  isBettingEnabled: {
    type: Boolean,
    default: true
  },
  inplay: Boolean,
  runners: Array,
  runnerNames: Array,
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
