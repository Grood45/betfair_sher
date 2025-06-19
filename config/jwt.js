const jwt = require("jsonwebtoken");
require('dotenv').config();

// Middleware to verify the token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract Bearer token

  if (!token) {
    return res.status(401).json({
      return_status: 0,
      return_message: "Access token missing",
      return_data: null,
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        return_status: 0,
        return_message: "Invalid or expired token",
        return_data: null,
      });
    }
    req.user = user;
    next();
  });
};

// Function to generate access token
const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES,
  });
};

// Function to generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(user, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES,
  });
};

module.exports = {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
};
