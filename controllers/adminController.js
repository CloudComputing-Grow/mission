// controllers/adminController.js
const adminService = require('../services/adminService');

const adminController = {
  // GET /admin/certifications
  async getCertifications(req, res) {
    try {
      const data = await adminService.getCertificationList();
      
      return res.status(200).json({
        success: true,
        data: {
          certs: data.certs,
          approvedCerts: data.approvedCerts
        }
      });
    } catch (err) {
      console.error('인증 목록 조회 실패:', err);
      return res.status(500).json({ success: false, message: '서버 오류 발생' });
    }
  },

  // POST /admin/certifications/:id/approve
  async approveCertification(req, res) {
    try {
      const certificationId = req.params.id;
      await adminService.approveCertification(certificationId);

      return res.status(200).json({
        success: true,
        message: '인증 승인 처리가 완료되었습니다.',
        redirectUrl: '/admin/certifications' // 프론트엔드 라우팅 유도용
      });
    } catch (err) {
      console.error('승인 실패:', err);
      return res.status(500).json({ success: false, message: '인증 승인 중 오류가 발생했습니다.' });
    }
  },

  // POST /admin/certifications/:id/cancel
  async cancelCertification(req, res) {
    try {
      const certificationId = req.params.id;
      await adminService.cancelCertification(certificationId);

      return res.status(200).json({
        success: true,
        message: '인증 취소 및 보상 회수 처리가 완료되었습니다.',
        redirectUrl: '/admin/certifications'
      });
    } catch (err) {
      console.error('취소 실패:', err);
      return res.status(500).json({ 
        success: false, 
        message: err.message || '인증 취소 중 오류가 발생했습니다.' 
      });
    }
  }
};

module.exports = adminController;
