const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

router.get('/', marketController.getAllLimits); // GET all
router.post('/', marketController.createOrUpdateLimit); // ADD or UPDATE


module.exports = router;
