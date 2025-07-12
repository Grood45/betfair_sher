const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

// Admin or Cron Job
router.get('/sync', matchController.syncAllMatches);
router.get('', matchController.getAllMatches);
// Public API to get from DB
router.get('/:sportId', matchController.getMatchesBySportId);
router.patch('/:id/betting', matchController.toggleBetting);
router.get('/events/summary', matchController.getEventSummary);

router.get('/bysport/:sportId', matchController.getMatchesBySportId);
// router.get('/bysport/:sportId', matchController.getAllMatchesBySportId);


module.exports = router;
