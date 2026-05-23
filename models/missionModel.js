// models/missionModel.js
const { promisePool } = require('../db/db');

const missionModel = {
  async getAllMissions() {
    const [rows] = await promisePool.query('SELECT * FROM mission');
    return rows;
  },

  async getMissionById(missionId) {
    const [[row]] = await promisePool.query('SELECT * FROM mission WHERE mission_id = ?', [missionId]);
    return row || null;
  },

  async getMissionsByLevel(level) {
    const [rows] = await promisePool.query('SELECT * FROM mission WHERE level = ? ORDER BY mission_id', [level]);
    return rows;
  },

  async getAvailableMissionForUser(userId, level) {
    const [[row]] = await promisePool.query(`
      SELECT m.mission_id
      FROM mission m
      LEFT JOIN mission_execution me 
        ON m.mission_id = me.mission_id AND me.user_id = ?
      WHERE m.level = ? AND (me.completed_or_not IS NULL OR me.completed_or_not = 0)
      LIMIT 1
    `, [userId, level]);
    return row || null;
  }
};

module.exports = missionModel;
