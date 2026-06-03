// routes/internalMissionRouter.js
const express = require('express');
const router = express.Router();
const missionController = require('../controllers/dashboardController');

// POST /api/internal/v1/missions/complete-by-fertilizer
router.post('/complete-by-fertilizer', missionController.completeMissionByFertilizer);

// GET /api/internal/v1/missions/executions/:missionExecutionId/status
router.get('/executions/:missionExecutionId/status', missionController.getExecutionStatus);

module.exports = router;
