const { promisePool } = require('../db/db');

exports.saveCertification = async ({ mission_execution_id, user_id, image_source }) => {
  const sql = `
    INSERT INTO certification (mission_execution_id, certification_date, user_id, image_source, checked)
    VALUES (?, now(),?, ?, false)
  `;
  await promisePool.query(sql, [mission_execution_id, user_id, image_source]);
};

exports.getCertificationsByUser = async (userId) => {
  const [rows] = await promisePool.query(`
    SELECT c.certification_id, c.mission_execution_id, c.user_id, me.mission_id, c.checked
    FROM certification c
    JOIN mission_execution me ON c.mission_execution_id = me.mission_execution_id
    WHERE c.user_id = ?
  `, [userId]);
  return rows;
};
