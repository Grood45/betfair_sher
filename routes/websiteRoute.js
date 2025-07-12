const express = require('express');
const router = express.Router();
const sportController = require('../controllers/website/sportController');
const matchController = require('../controllers/matchController');
const multer = require('multer');
const path = require('path');

router.get('/sport/list', sportController.getAllSportNames);
router.get('/sport/inplay/:sportId', sportController.getInplayMatches);
router.get('/sport/fancy/:sportId', sportController.getInplayFancy);
router.get('/sport/premium/:eventId', matchController.getPremiumEventByEventId);

router.post('/sport/sync/premium/:sportId/:eventId', matchController.syncPremiumEvent);
router.post('/event/sync/premium', matchController.syncPremiumEvent);


module.exports = router;


