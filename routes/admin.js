// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

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

// 엔드포인트 바인딩

// GET /api/v1/admin/certs
router.get('/certs', adminController.getCertifications);

// POST /api/v1/admin/certs/:id/approve
router.post('/certs/:id/approve', adminController.approveCertification);

// POST /api/v1/admin/certs/:id/cancel
router.post('/certs/:id/cancel', adminController.cancelCertification);

module.exports = router;
