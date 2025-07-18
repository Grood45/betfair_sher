const mongoose = require('mongoose');

const EventListSchema = new mongoose.Schema({
  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sport',
    required: true
  },
  betfairEventList: {
    isFound: Number,
    message: String,
    result: [mongoose.Schema.Types.Mixed]
  },
  sportradarEventList: {
    isFound: Number,
    message: String,
    result: [mongoose.Schema.Types.Mixed]
  },
  status: { type: Number, default: 1 },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EventList', EventListSchema);
