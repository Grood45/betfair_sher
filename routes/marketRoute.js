const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

router.get('/', marketController.getAllLimits); // GET all
router.post('/', marketController.createOrUpdateLimit); // ADD or UPDATE
router.get('/list/getExchangeOddsByEventId/:eventId', marketController.getExchangeOddsByEventId); // ADD or UPDATE
router.get('/list/sync/exchangeodds/:eventId', marketController.syncMarketList);

router.get('/sync-bookmaker/:eventId', marketController.syncBookmakerMarkets);
router.get('/sync-fancy-bm/:eventId', marketController.syncFancyMarkets);

module.exports = router;
