const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');
const multer = require('multer');
const path = require('path');
// Multer storage config with original extension preserved
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/icons/');
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname); // e.g. ".jpg"
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      cb(null, filename);
    }
  });
  
  const upload = multer({ storage });
// const upload = multer({ dest: 'uploads/icons/' }); // customize storage as needed

// Register routes
router.post('/create',upload.single('icon'), sportController.create);
router.put('/:id',upload.single('icon'), sportController.update);
router.get('/sync', sportController.sync);
router.get('', sportController.getAll);
router.get('/name', sportController.getAllSportNames);


module.exports = router;
