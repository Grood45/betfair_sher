const mongoose = require('mongoose');

// Reusable Market schema used for both BMmarket and Fancymarket
const MarketSchema = new mongoose.Schema({
  mid: { type: String, required: true },
  sid: { type: Number, required: true },
  nat: { type: String, required: true },
  b1: { type: String, default: "0" },
  bs1: { type: String, default: "0" },
  l1: { type: String, default: "0" },
  ls1: { type: String, default: "0" },
  b2: { type: String, default: "0.00" },
  bs2: { type: String, default: "0.00" },
  l2: { type: String, default: "0.00" },
  ls2: { type: String, default: "0.00" },
  b3: { type: String, default: "0.00" },
  bs3: { type: String, default: "0.00" },
  l3: { type: String, default: "0.00" },
  ls3: { type: String, default: "0.00" },
  gtype: { type: String, default: "Fancy" },
  utime: { type: Number, default: 0 },
  gvalid: { type: Number, default: 0 },
  gstatus: { type: String, default: "SUSPENDED" },
  s: { type: String, default: "SUSPENDED" },
  remark: { type: String, default: "" },
  remark1: { type: String, default: "" },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 0 },
  sr: { type: Number },    // Only in BMmarket
  srno: { type: Number },  // Only in Fancymarket
  s1: { type: String, default: "0" },
  s2: { type: String, default: "0" },
  ballsess: { type: Number }, // Only in Fancymarket
  b1S: { type: String, default: "False" },
  b2S: { type: String, default: "False" },
  b3S: { type: String, default: "False" },
  l1S: { type: String, default: "False" },
  l2S: { type: String, default: "False" },
  l3S: { type: String, default: "False" }
}, { _id: false });

// Schema for the inner "data" object
const DataSchema = new mongoose.Schema({
  vid: { type: String, required: true },
  updatetime: { type: Date },
  update: { type: String },
  BMmarket: {
    bm1: [MarketSchema]
  },
  Fancymarket: [MarketSchema]
}, { _id: false });

// Root schema containing "status" and "data"
const FancymarketSchema = new mongoose.Schema({
  status: { type: String, required: true },
  data: DataSchema
});

// Export model as Fancymarket
module.exports = mongoose.model('Fancymarket', FancymarketSchema);
