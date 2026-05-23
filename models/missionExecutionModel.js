// models/missionExecutionModel.js
const { promisePool } = require('../db/db');

const missionExecutionModel = {
  async createExecution(missionId, userId, completedOrNot = false) {
    const [result] = await promisePool.query(
      'INSERT INTO mission_execution (mission_id, user_id, completed_or_not) VALUES (?, ?, ?)',
      [missionId, userId, completedOrNot]
    );
    return result.insertId;
  },

  async createExecutionWithDate(missionId, userId, completedOrNot = true) {
    await promisePool.query(`
      INSERT INTO mission_execution (mission_id, user_id, completed_or_not, completed_date)
      VALUES (?, ?, ?, NOW())
    `, [missionId, userId, completedOrNot]);
  },

  async updateExecutionToComplete(missionExecutionId) {
    await promisePool.query(`
      UPDATE mission_execution
      SET completed_or_not = true,
          completed_date = NOW()
      WHERE mission_execution_id = ?
    `, [missionExecutionId]);
  },

  async getCompletedDatesByLevel(userId, level) {
    const [rows] = await promisePool.query(`
      SELECT me.completed_date
      FROM mission_execution me
      JOIN mission m ON me.mission_id = m.mission_id
      WHERE me.user_id = ? AND m.level = ? AND me.completed_or_not = true
      ORDER BY completed_date ASC
    `, [userId, level]);
    return rows;
  },

  async getExecutionIdsByLevel(userId, level) {
    const [rows] = await promisePool.query(`
      SELECT mission_execution_id FROM mission_execution me
      JOIN mission m ON me.mission_id = m.mission_id
      WHERE me.user_id = ? AND m.level = ?
    `, [userId, level]);
    return rows.map(e => e.mission_execution_id);
  },

  async deleteExecutionsInIds(ids) {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await promisePool.query(`DELETE FROM mission_execution WHERE mission_execution_id IN (${placeholders})`, ids);
  }
};

module.exports = missionExecutionModel;
