const jwt = require('jsonwebtoken');

const getUserIdFromToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    throw new Error('Access token missing');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
};

module.exports = { getUserIdFromToken };
