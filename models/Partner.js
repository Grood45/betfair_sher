const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  partnerName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  websiteDomain: { type: String, required: true },
  commissionPercent: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  callbackUrls: [{ type: String }],
  endpoints: [{ type: String }],
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);
