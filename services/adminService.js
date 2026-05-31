// services/adminService.js
const certModel = require('../models/certificationModel');

const userService = require('./external/userService');
const inventoryService = require('./external/inventoryService');

const externalServiceClient = {
  getUserNicknameMap: userService.getUserNicknameMap, // To. 유저 서비스
  revokeFertilizer: inventoryService.revokeFertilizer  // To. 인벤토리 서비스
};

const adminService = {
  async getCertificationList() {
    // 1. 내부 로컬 DB 데이터 독립 조회
    const pendingCerts = await certModel.getPendingCertifications();
    const approvedCerts = await certModel.getRecentApprovedCertifications();

    // 2. 외부 유저 서비스와 통신하기 위해 중복 없는 user_id 목록 추출
    const userIds = [...new Set([
      ...pendingCerts.map(c => c.user_id),
      ...approvedCerts.map(c => c.user_id)
    ])];

    // 3. 외부 서비스에서 닉네임 정보 획득
    const nicknameMap = await externalServiceClient.getUserNicknameMap(userIds);

    // 4. 유저 데이터 바인딩하여 최종 프론트용 데이터 조립
    const formattedPending = pendingCerts.map(c => ({
      certification_id: c.certification_id,
      image_source: c.image_source,
      certification_date: c.certification_date,
      mission_description: c.mission_description,
      nickname: nicknameMap[c.user_id] || '알 수 없는 유저'
    }));

    const formattedApproved = approvedCerts.map(c => ({
      certification_id: c.certification_id,
      image_source: c.image_source,
      certification_date: c.certification_date,
      mission_description: c.mission_description,
      nickname: nicknameMap[c.user_id] || '알 수 없는 유저'
    }));

    return { certs: formattedPending, approvedCerts: formattedApproved };
  },

  async approveCertification(certificationId) {
    await certModel.approveCertification(certificationId);
  },

  async cancelCertification(certificationId) {
    // 1. 인증 정보 확인
    const cert = await certModel.getCertificationById(certificationId);
    if (!cert) {
      throw new Error('존재하지 않는 인증 정보입니다.');
    }

    // 2. 인증 취소 처리 (checked = false)
    await certModel.cancelCertificationCheck(certificationId);

    // 3. 사용자가 이미 완료 확정을 지어 보상을 받았던 건이라면 -> 외부 통신으로 비료 회수
    if (cert.confirmed_by_user) {
      await externalServiceClient.revokeFertilizer(cert.user_id);
    }
  }
};

module.exports = adminService;
