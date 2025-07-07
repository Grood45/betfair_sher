const mongoose = require('mongoose');

/* ── reusable sub‑schema (unchanged) ──────────────────────────────────── */
const MarketSchema = new mongoose.Schema(
  {
    mid: String,
    sid: Number,
    nat: String,
    b1: String,  bs1: String,  l1: String,  ls1: String,
    b2: String,  bs2: String,  l2: String,  ls2: String,
    b3: String,  bs3: String,  l3: String,  ls3: String,
    gtype: String,
    utime: Number,
    gvalid: Number,
    gstatus: String,
    s: String,
    remark: String,
    remark1: String,
    min: Number,
    max: Number,
    sr: Number,      // Bookmaker only
    srno: Number,    // Fancy only
    s1: String,
    s2: String,
    ballsess: Number,
    b1S: String,  b2S: String,  b3S: String,
    l1S: String,  l2S: String,  l3S: String
  },
  { _id: false }
);

/* ── flattened top‑level document ─────────────────────────────────────── */
const FancymarketSchema = new mongoose.Schema({
  /* basic meta */
  status:   { type: String, required: true },   // e.g. "1"
  vid:      { type: String, required: true },   // “3‑69‑123”
  eventId:  { type: String, required: true },   // param from URL
  updatetime: Date,
  update:   String,

  /* snapshots */
  BMmarket: {
    bm1: [MarketSchema]
  },
  Fancymarket: [MarketSchema]
});

/* indexes: one document per eventId (+ optional vid) */
FancymarketSchema.index({ eventId: 1 }, { unique: true });

module.exports = mongoose.model('Fancymarket', FancymarketSchema);
