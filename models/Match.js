const mongoose = require('mongoose');

const runnerSchema = new mongoose.Schema({
  selectionName: String,
  selectionId: String,
  lockBackBets: Boolean,
  lockLayBets: Boolean
}, { _id: false });

const marketSchema = new mongoose.Schema({
  marketName: String,
  gameId: Number,
  marketId: String,
  runners: [runnerSchema],
  open: Number,
  status: Number,
  isInPlay: Number,
  betDelay: Number
}, { _id: false });

const matchSchema = new mongoose.Schema({
  event_id: { type: String, required: true, unique: true },      // betfair_event_id
  betfair_event_id: String,
  sportradar_event_id: String,
  sky_event_id: String,

  betfair_sport_id: String,
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport' },  // reference to Sport collection
  sport_name: String,
  sportradar_sport_id: String,

  betfair_competition_id: String,
  competition_name: String,
  sportradar_competition_id: String,
  sportrader_compitionname: String,
  sportrader_eventName: String,

  betfair_competitionRegion: String,

  event_name: String,
  event_timezone: String,
  event_date: Date,
  event_date_ist_formatted: String,

  is_in_play: String,
  status: String,

  is_fancy: String,
  isbm: String,
  is_premium: String,
  scoure_card: String,
  accept_any_odds: String,

  Sportrader_market_id: String,
  betfair_event_marketCount: String,

  min_stake: String,
  max_stake: String,
  odd_limit: String,
  bet_delay: String,

  total_matched: String,
  port: String,

  live_tv_id: String,
  score_card_id: String,
  sportrader_card_id: String,

  match_odds_market: [marketSchema],

  isBettingEnabled: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
