const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const verifyToken = require('../middleware/verifyToken');
// Register routes
router.get('/sport/list', serviceController.sportList);



module.exports = router;
