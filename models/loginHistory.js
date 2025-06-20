const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // assuming you have a User model
    required: true,
  },
  loginDate: {
    type: Date,
    default: Date.now,
  },
  logoutDate: {
    type: Date,
  },
  ipAddress: {
    type: String,
  },
  browser: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
