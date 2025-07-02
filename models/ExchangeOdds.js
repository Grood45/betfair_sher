const mongoose = require('mongoose');

const exchangePricesSchema = new mongoose.Schema({
  AvailableToBack: [
    {
      price: Number,
      size: Number
    }
  ],
  AvailableToLay: [
    {
      price: Number,
      size: Number
    }
  ]
}, { _id: false });

const runnerSchema = new mongoose.Schema({
  SelectionId: Number,
  runnerName: String,
  Status: String,
  LastPriceTraded: Number,
  TotalMatched: Number,
  ExchangePrices: exchangePricesSchema
}, { _id: false });

const exchangeOddsSchema = new mongoose.Schema({
  MarketId: String,
  eventId: String,
  marketName: String,
  Status: String,
  IsInplay: Boolean,
  updateTime: String,
  sport: String,
  NumberOfRunners: Number,
  NumberOfActiveRunners: Number,
  TotalMatched: Number,
  Runners: [runnerSchema]
}, { timestamps: true });

module.exports = mongoose.model('ExchangeOdds', exchangeOddsSchema);
