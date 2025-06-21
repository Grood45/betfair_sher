const mongoose = require('mongoose');

const scoreApiSchema = new mongoose.Schema({
  apiName: { type: String, required: true },
  category: { type: String, enum: ['TV', 'Score'], required: true },
  codeType: { type: String, enum: ['iframe', 'm3u8'], required: true },
  apiUrl: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('scoreApi', scoreApiSchema);
