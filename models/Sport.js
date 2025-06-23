const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  icon: String,                // icon filename or URL
  banner: String,                // banner filename or URL
  externalId: Number,
  displayName: { type: String, required: true },
  position: { type: Number, default: 1 },
  provider: { type: String, default: 'Manual' },
  minBet: { type: Number, default: 0 },
  maxBet: { type: Number, default: 0 },
  bettingStatus: { type: Number, default: 0 }, // true = enabled
  sportStatus: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, {
  timestamps: true
});

module.exports = mongoose.model('Sport', sportSchema);
