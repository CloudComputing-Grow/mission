// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


// 엔드포인트 바인딩
router.get('/certifications', adminController.getCertifications);
router.post('/certifications/:id/approve', adminController.approveCertification);
router.post('/certifications/:id/cancel', adminController.cancelCertification);

module.exports = router;
