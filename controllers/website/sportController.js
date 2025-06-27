const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Sport = require('../../models/Sport');

const fs = require('fs');
const path = require('path');
const axios = require('axios');



exports.getAllSportNames = async (req, res) => {
  try {
    const sports = await Sport.find({}, { displayName: 1 }); // select name and _id
                                 // optional: sort alphabetically

    return res.status(200).json({
      message: 'Sports fetched successfully',
      data: sports
    });
  } catch (err) {
    console.error('Error fetching sports:', err.message);
    return res.status(500).json({
      message: 'Failed to fetch sports',
      error: err.message
    });
  }
};
