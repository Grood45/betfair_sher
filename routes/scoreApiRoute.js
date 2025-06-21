const express = require('express');
const router = express.Router();
const scoreApiController = require('../controllers/scoreApiController');

// Register routes
router.post('/create', scoreApiController.create);
router.get('/:id', scoreApiController.getById);
router.get('', scoreApiController.getAll);
router.put('/:id', scoreApiController.update);



module.exports = router;
