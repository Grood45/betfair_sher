const User = require('../models/User');
const Sport = require('../models/Sport');
const Match = require('../models/Match');

exports.getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const [
      allSports,
      inPlayCount,
      todayMatches,
      tomorrowMatches
    ] = await Promise.all([
      Sport.countDocuments(),
      Match.countDocuments({ $or: [{ isMatchLive: true }, { inplay: true }] }),
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
        totalBets: 0,        // default value since Bet model doesn't exist
        totalAmount: 0       // default value
      }
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
