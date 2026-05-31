// routes/dashboard.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dashboardController = require('../controllers/dashboardController');
const { uploader, uploadToGCS } = require('../middlewares/upload');


// GET /api/v1/missions
router.get('/', dashboardController.getMissionList);

// GET /api/v1/missions/detail
router.get('/detail', dashboardController.getDashboard);

// POST /api/v1/missions/submit
router.post('/submit', uploader.single('photo'), uploadToGCS, dashboardController.submitMission);

// POST /api/v1/missions/confirm/:mission_execution_id
router.post('/confirm/:mission_execution_id', dashboardController.confirmMission);

// POST /api/v1/missions/level-option
router.post('/level-option', dashboardController.postLevelOption);

module.exports = router;
