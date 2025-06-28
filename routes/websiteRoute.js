const express = require('express');
const router = express.Router();
const sportController = require('../controllers/website/sportController');
const multer = require('multer');
const path = require('path');

router.get('/sport/list', sportController.getAllSportNames);
router.get('/sport/inplay/:sportId', sportController.getInplayMatches);


module.exports = router;
