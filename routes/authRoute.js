const express = require('express');
const router = express.Router();
const authController = require('../controllers/userAuthController');

// Register routes
router.get('/register', authController.registerPage);
router.post('/register', authController.registerUser);

// Login routes
router.get('/login', authController.loginPage);
router.post('/login', authController.loginUser);

router.get('/logout', authController.logout);

module.exports = router;
