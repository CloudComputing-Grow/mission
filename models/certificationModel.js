// models/certificationModel.js
const { promisePool } = require('../db/db');

const certModel = {
  async getCertificationsByUser(userId) {
    const [rows] = await promisePool.query('SELECT * FROM certification WHERE user_id = ?', [userId]);
    return rows;
  },

  async getCertStatusDetails(userId) {
    const [rows] = await promisePool.query(`
      SELECT me.mission_id, c.checked, c.certification_date, c.confirmed_by_user, me.mission_execution_id
      FROM certification c
      JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
      WHERE c.user_id = ?
    `, [userId]);
    return rows;
  },

  async saveCertification({ mission_execution_id, user_id, image_source }) {
    await promisePool.query(`
      INSERT INTO certification (mission_execution_id, user_id, image_source)
      VALUES (?, ?, ?)
    `, [mission_execution_id, user_id, image_source]);
  },

  async updateConfirmation(missionExecutionId, userId) {
    await promisePool.query(`
      UPDATE certification
      SET confirmed_by_user = true,
          completed_date = NOW()
      WHERE mission_execution_id = ? AND user_id = ? AND checked = true
    `, [missionExecutionId, userId]);
  },

  async deleteCertificationsInExecutionIds(ids) {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await promisePool.query(`DELETE FROM certification WHERE mission_execution_id IN (${placeholders})`, ids);
  },

  // 검증 대기중인 인증 목록 조회 (checked = false)
  async getPendingCertifications() {
    const [rows] = await promisePool.query(`
      SELECT 
        c.certification_id, 
        c.user_id,
        c.image_source, 
        c.certification_date,
        m.description as mission_description
      FROM certification c
      JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
      JOIN mission m ON me.mission_id = m.mission_id
      WHERE c.checked = false
      ORDER BY c.certification_date DESC
    `);
    return rows;
  },

  // 최근 1일간 승인 완료된 인증 목록 조회
  async getRecentApprovedCertifications() {
    const [rows] = await promisePool.query(`
      SELECT 
        c.certification_id, 
        c.user_id,
        m.description as mission_description, 
        c.certification_date, 
        c.image_source
      FROM certification c
      JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
      JOIN mission m ON me.mission_id = m.mission_id
      WHERE c.checked = 1 AND c.confirmed_by_user = 1
        AND c.certification_date >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      ORDER BY c.certification_date DESC
    `);
    return rows;
  },

  // 인증 ID로 상세 조회
  async getCertificationById(certificationId) {
    const [[row]] = await promisePool.query(`
      SELECT certification_id, mission_execution_id, user_id, confirmed_by_user
      FROM certification
      WHERE certification_id = ?
    `, [certificationId]);
    return row || null;
  },

  // 인증 승인 상태 변경
  async approveCertification(certificationId) {
    await promisePool.query(`
      UPDATE certification
      SET checked = true, confirmed_by_user = false
      WHERE certification_id = ?
    `, [certificationId]);
  },

  // 인증 체크 취소
  async cancelCertificationCheck(certificationId) {
    await promisePool.query(`
      UPDATE certification
      SET checked = false
      WHERE certification_id = ?
    `, [certificationId]);
  }
};


module.exports = certModel;
