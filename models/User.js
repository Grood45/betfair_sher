// models/User.js
const mongoose = require('mongoose');

const childMenuSchema = new mongoose.Schema({
  label: { type: String, required: true },
  key: { type: String, required: true }
}, { _id: false });

const menuSchema = new mongoose.Schema({
  label: { type: String, required: true },
  key: { type: String, required: true },
  children: [childMenuSchema]
}, { _id: false });

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
    customMenus: [menuSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
