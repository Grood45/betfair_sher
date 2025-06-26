const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { verifyToken } = require('../config/jwt'); // ✅ Correct path

router.use(verifyToken);

router.get('', dashboardController.getDashboardStats);

module.exports = router; 