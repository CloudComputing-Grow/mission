// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


// 엔드포인트 바인딩

// GET /api/v1/admin/certs
router.get('/certs', adminController.getCertifications);

// POST /api/v1/admin/certs/:id/approve
router.post('/certs/:id/approve', adminController.approveCertification);

// POST /api/v1/admin/certs/:id/cancel
router.post('/certs/:id/cancel', adminController.cancelCertification);

module.exports = router;
