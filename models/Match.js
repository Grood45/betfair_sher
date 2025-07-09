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
  event_id: { type: String },      // betfair_event_id
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
  event_date: String,
  event_date_ist_formatted: String,

  is_in_play: String,
  status: String,
 

  isFancy: Boolean,
  isBm: Boolean,
  isPremium: Boolean,
  sportsName: String,

  competitionName: String,
  totalMatched: Number,
  time: Date,
  isInPlay: Number,
  eventTypeId: String,
  competitionId: Number,
  eventId: Number,
  eventName: String,
  fancyInplay: Number,
  premiumInplay: Number,
  winTheTossInplay: Number,
  winTheTossInplay1: Number,
  bookmakerInplay: Number,
  bookmakerInplay_source0: Number,
  bookmakerInplay_source1: Number,
  tiedMatchInplay: Number,
  tiedMatchInplay1: Number,
  overUnderInplay: Number,
  overUnderInplay1: Number,
  matchOddsInplay: Number,
  matchOddsInplay1: Number,
  superOverInplay: Number,
  isManualInplay: Boolean,
  minBeforeInplay: Number,
  isStream: Boolean,
  premiumMain: Number,

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

}, { timestamps: true ,strict: false });

module.exports = mongoose.model('Match', matchSchema);
