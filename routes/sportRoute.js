const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');
const verifyToken = require('../middleware/verifyToken');
const betfairAuthMiddleware = require('../middleware/betfairAuth');

// Register routes
router.get('/list', betfairAuthMiddleware,sportController.sportList);
router.get('/event/list', betfairAuthMiddleware,sportController.getEventsList);
router.get('/radar/event/list', betfairAuthMiddleware,sportController.fetchAndStoreSportradarEvents);
router.get('/betfair/market/list',betfairAuthMiddleware, sportController.fetchAndStoreBetfairMarkets);
router.get('/betfair/market/odds', sportController.fetchAndStoreBetfairMarketsOdds);
router.get('/betfair/market/result',betfairAuthMiddleware, sportController.getBetfairMarketResultsByEvent);


module.exports = router;
