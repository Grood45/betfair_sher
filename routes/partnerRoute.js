const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');

// Register routes
router.post('/create', partnerController.create);
router.post('/signin', partnerController.loginUser);
router.get('/:id', partnerController.getPartnerById);
router.get('', partnerController.getAllPartners);
router.put('/:id', partnerController.updatePartner);
router.delete('/:id', partnerController.deletePartner);
router.patch('/:id/status', partnerController.setPartnerStatus);
router.post('/card/token', partnerController.generatePartnerToken);
router.patch('/:id/password', partnerController.changePassword);


module.exports = router;
