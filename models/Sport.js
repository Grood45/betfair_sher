const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  // Existing fields
  icon: { type: String },                       // icon filename or URL
  banner: { type: String },                     // banner filename or URL
  externalId: { type: Number },
  sportId: { type: Number },
  displayName: { type: String, required: true }, // keep existing field
  position: { type: Number, default: 1 },
  provider: { type: String, default: 'Manual' },
  minBet: { type: Number, default: 0 },
  maxBet: { type: Number, default: 0 },
  bettingStatus: { type: Boolean, default: false },
  sportStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },

  // ✅ New merged fields
  sportName: { type: String },                   // additional descriptive name
  childName: { type: String },                   // optional child sport name
  marketCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  bettingEnabled: { type: Boolean, default: false },
  maxBetLimit: { type: Number, default: 0 },
  minBetLimit: { type: Number, default: 0 },
  oddsProvider: { type: String },
  featured: { type: Boolean, default: false },
  betfairEventTypeId: { type: String, default: '0' },
  sportradarSportId: { type: String }

}, {
  timestamps: true
});

module.exports = mongoose.model('Sport', sportSchema);


