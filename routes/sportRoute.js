const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');
const verifyToken = require('../middleware/verifyToken');
// Register routes
router.post('list', sportController.sportList);



module.exports = router;
