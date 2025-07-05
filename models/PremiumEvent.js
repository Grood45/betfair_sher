// models/PremiumEvent.js
const mongoose = require('mongoose');

/* --- Price (back / lay) --- */
const priceSchema = new mongoose.Schema({
  price: Number,
  size: Number
}, { _id: false });

/* --- Runner --- */
const runnerSchema = new mongoose.Schema({
  runnerId: String,
  runnerName: String,
  status: String,
  sort: String,
  layPrices: [priceSchema],
  backPrices: [priceSchema],
  clothNumber: String,
  stallDraw: String,
  runnerIcon: String,
  jockeyName: String,
  trainerName: String,
  runnerAge: String
}, { _id: false });

/* --- Limits --- */
const limitSchema = new mongoose.Schema({
  minBetValue: Number,
  maxBetValue: Number,
  oddsLimit: Number,
  currency: String
}, { _id: false });

/* --- Market --- */
const marketSchema = new mongoose.Schema({
  marketId: String,
  marketName: String,
  marketType: String,
  marketTime: Number,
  status: String,
  runners: [runnerSchema],
  limits: limitSchema,
  category: String
}, { _id: false });

/* --- Premium Event (top‑level) --- */
const premiumEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventName: String,

  competitionId: String,
  competitionName: String,

  awayScore: Number,
  homeScore: Number,

  marketId: String,
  markets: {
    bookmakers: mongoose.Schema.Types.Mixed,   // null or object → keep flexible
    fancyMarkets: mongoose.Schema.Types.Mixed, // null or object → keep flexible
    matchOdds: [marketSchema]                  // array of markets
  }
}, { timestamps: true });

module.exports = mongoose.model('PremiumEvent', premiumEventSchema);
