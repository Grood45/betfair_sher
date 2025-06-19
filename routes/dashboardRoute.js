const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { verifyToken } = require('../config/jwt'); // ✅ Correct path

router.use(verifyToken);

// router.get('/dashboard', dashboardController.dashboard);
// router.get('/user-list', dashboardController.listUsers);

module.exports = router; 