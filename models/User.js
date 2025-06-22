// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: null },
  mobile: { type: String, default: null },
  role: {
    type: String,
    enum: ['superadmin', 'user', 'partner','staff'],
    default: 'user'
  },
  status: { type: Number, default: 1 },
  createdBy: { type: String, default: 'superadmin' },
    creatorId: {
      type: String
    },
    customMenus: [String]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
