const express = require('express');
const router = express.Router();
const authController = require('../controllers/userAuthController');
const verifyToken = require('../middleware/verifyToken');
// Register routes
router.post('/api/signup', authController.signUp);

// Login routes
router.post('/api/signin', authController.loginUser);

router.get('/api/refresh/token',authController.refreshToken);



module.exports = router;
