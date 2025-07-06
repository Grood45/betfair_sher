const mongoose = require('mongoose');

/* ------------ Runner ------------ */
const runnerSchema = new mongoose.Schema({
  selectionId: Number,
  runnerName:  String,
  backOdds:    Number,
  layOdds:     Number,
  backOddsList:[String],
  layOddsList: [String],
  // …other runner flags if needed
}, { _id: false });

/* ------------ Limits ------------ */
const limitSchema = new mongoose.Schema({
  minBetValue: Number,
  maxBetValue: Number,
  oddsLimit:   Number,
  currency:    String
}, { _id: false });

/* ------------ Market ------------ */
const subMarketSchema = new mongoose.Schema({
  marketId:     { type: String, required: true },
  marketName:   String,
  marketType:   String,
  minStake:     Number,
  maxStake:     Number,
  runners:      [runnerSchema],
  limits:       limitSchema,
  fancy:        Boolean,
  ballRunning:  Boolean
}, { _id: false });

/* ------------ Category Details ------------ */
const categorySchema = new mongoose.Schema({
  id: Number,
  catName: String,
  oddTypeCat: String,
  oddType: String,
  runnersNo: String
}, { _id: false });

/* ------------ Top‑level BookmakerMarket ------------ */
const bookmakerMarketSchema = new mongoose.Schema({
  /** Composite key */
  eventId:  { type: String, required: true },
  marketId: { type: String, required: true },

  /** Payload */
  market:          subMarketSchema,
  categoryDetails: categorySchema,

  /** Meta */
  eventName:       String,
  competitionId:   String,
  competitionName: String,
  feedTimestamp:   Date
}, { timestamps: true });

/* Compound unique index on (eventId, marketId) */
// bookmakerMarketSchema.index({ eventId: 1, marketId: 1 }, { unique: true });

module.exports = mongoose.model('BookmakerMarket', bookmakerMarketSchema);
