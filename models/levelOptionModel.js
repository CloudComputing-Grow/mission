// models/levelOptionModel.js
const { promisePool } = require('../db/db');

const levelOptionModel = {
  async getLatestOption(userId) {
    const [[row]] = await promisePool.query(`
      SELECT selected_option FROM level_option
      WHERE user_id = ?
      ORDER BY selected_date DESC
      LIMIT 1
    `, [userId]);
    return row || null;
  },

  async deleteOptionsByUserId(userId) {
    await promisePool.query('DELETE FROM level_option WHERE user_id = ?', [userId]);
  },

  async insertOption(userId, option) {
    await promisePool.query(`
      INSERT INTO level_option (user_id, selected_option, selected_date)
      VALUES (?, ?, NOW())
    `, [userId, option]);
  }
};

module.exports = levelOptionModel;
