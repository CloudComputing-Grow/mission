// routes/internalMissionRouter.js
const express = require('express');
const router = express.Router();
const missionController = require('../controllers/dashboardController');

// POST /api/internal/missions/complete-by-fertilizer
router.post('/complete-by-fertilizer', missionController.completeMissionByFertilizer);

module.exports = router;
