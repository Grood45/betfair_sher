const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const sportController = require('../controllers/sportController');
const verifyToken = require('../middleware/verifyToken');
const betfairAuthMiddleware = require('../middleware/betfairAuth');

// Register routes
router.get('/sport/list', serviceController.sportList);
router.get('/event/list/:fastOddsId', serviceController.getEvents);
router.get('/betfair/market/list/:sportId/:eventId', serviceController.getBetfairMarketByEventsId);
router.get('/betfair/market/odds/:eventId', serviceController.getBetfairMarketOddsByEventsId);
router.get('/betfair/market/odds/live/:sportId/:eventId', serviceController.liveBetfairMarketsOddsByParams);
router.post('/betfair/market/results', serviceController.getBetfairMarketResultsByIds);


module.exports = router;
