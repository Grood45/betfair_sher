const User = require('../models/User');
const Sport = require('../models/Sport');
const Match = require('../models/Match');
const moment = require('moment-timezone');

// Get current time in IST
const currentISTTime = moment().tz("Asia/Kolkata").toDate();


exports.getDashboardStats = async (req, res) => {
  try {
    // Current IST time
    const currentISTTime = moment().tz("Asia/Kolkata").toDate();

    // Start and end of today in IST
    const todayStart = moment().tz("Asia/Kolkata").startOf('day').toDate();
    const todayEnd = moment().tz("Asia/Kolkata").endOf('day').toDate();

    // Start and end of tomorrow in IST
    const tomorrowStart = moment(todayStart).add(1, 'day').toDate();
    const tomorrowEnd = moment(todayEnd).add(1, 'day').toDate();

    const [allSports, inPlayCount, todayMatches, tomorrowMatches] = await Promise.all([
      Sport.countDocuments(),
      Match.countDocuments({ event_date: { $lte: currentISTTime } }),  // LIVE Matches
      Match.countDocuments({ event_date: { $gte: todayStart, $lte: todayEnd } }),
      Match.countDocuments({ event_date: { $gte: tomorrowStart, $lte: tomorrowEnd } })
    ]);

    res.status(200).json({
      message: 'Dashboard statistics fetched successfully',
      data: {
        allSports,
        inPlayCount,
        today: todayMatches,
        tomorrow: tomorrowMatches,
        totalBets: 0,        // placeholder
        totalAmount: 0       // placeholder
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
