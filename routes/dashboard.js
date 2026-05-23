// routes/dashboard.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dashboardController = require('../controllers/dashboardController');


const uploadPath = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadPath); },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});
const upload = multer({ storage });


router.get('/', dashboardController.getDashboard);
router.post('/submit', upload.single('photo'), dashboardController.submitMission);
router.post('/confirm/:mission_execution_id', dashboardController.confirmMission);
router.get('/mission', dashboardController.getMissionList);
router.post('/level-option', dashboardController.postLevelOption);
router.post('/use-fertilizer', dashboardController.useFertilizer);

module.exports = router;
