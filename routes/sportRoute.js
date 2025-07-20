const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');
const verifyToken = require('../middleware/verifyToken');
// Register routes
router.get('/list', sportController.sportList);
router.get('/event/list', sportController.getEventsList);
router.get('/radar/event/list', sportController.fetchAndStoreSportradarEvents);



module.exports = router;
