const User = require('../models/User');

exports.dashboard = async(req, res) => { 
  const mobile = req.user.mobile;
  const user = await User.findOne({ mobile });
  const accessToken = req.cookies.accessToken;
  res.render('dashboard', { user, accessToken }); 
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().lean(); // lean() for faster performance
    res.render('userList', { users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Server Error');
  }
};