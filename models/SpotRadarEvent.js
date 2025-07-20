const mongoose = require('mongoose');
const { Schema } = mongoose;

const spotRadarEventSchema = new Schema(
  {
    FastoddsId: String, // replaces sportId
    radarSportId: String, // replaces sportId
    spotradardeventlist: Schema.Types.Mixed
  },
  {
    timestamps: true // automatically adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('SpotRadarEvent', spotRadarEventSchema);
