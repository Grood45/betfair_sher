const express = require('express');
const router = express.Router();
const authController = require('../controllers/userAuthController');
const verifyToken = require('../middleware/verifyToken');
// Register routes
router.post('/api/signup', authController.signUp);

// Login routes
router.post('/api/menu/permission',verifyToken,authController.createRole);
router.post('/api/signin', authController.loginUser);
router.get('/api/user/profile', authController.getUserProfile);
router.get('/api/user/:id/menus', authController.getMenusByStaffId);
router.get('/api/logout',verifyToken, authController.logout);
router.get('/api/login/history',verifyToken, authController.getLoginHistory);
router.get('/api/refresh/token',authController.refreshToken);



module.exports = router;
