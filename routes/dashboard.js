// routes/dashboard.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dashboardController = require('../controllers/dashboardController');
const { uploader, uploadToGCS } = require('../middlewares/upload');

// 게이트웨이가 주입해 준 X-User-Id 헤더를 req.user에 매핑하는 경량 미들웨어
const extractUserFromGateway = (req, res, next) => {
  const userId = req.headers['x-user-id']; // API 게이트웨이가 검증 후 넣어준 헤더
  if (!userId) {
    return res.status(401).json({ success: false, message: '안전하지 않은 접근이거나 게이트웨이를 거치지 않았습니다.' });
  }
  req.user = { user_id: Number(userId) };
  next();
};

// 모든 미션 서비스 API 진입점 앞에 미들웨어 배치
router.use(extractUserFromGateway);


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
