const mongoose = require('mongoose');


const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  menus: [{ type: String }]
});

module.exports = mongoose.model('Role', roleSchema);
