const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');

// Register routes
router.post('/create', partnerController.create);
// router.put('/update/worker/:id', workerController.updateWorker);
// router.get('/worker/:id', workerController.getWorkerById);
// router.get('/worker/list', workerController.getAllWorkers);

// router.delete('/delete/worker/:id', workerController.delete);


module.exports = router;
