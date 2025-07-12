// models/PremiumEvent.js
const mongoose = require('mongoose');

const premiumEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  sportId: { type: String },
  jsonData: mongoose.Schema.Types.Mixed // flexible for full API response
}, { timestamps: true });

module.exports = mongoose.model('PremiumEvent', premiumEventSchema);
