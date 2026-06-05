const axios = require('axios');
const INTERNAL_API_URL = (process.env.USER_SERVICE_URL || 'http://user:3001') + '/api/internal/v1';

const userService = {
  async getUser(userId) {
    try {
      const response = await axios.get(`${INTERNAL_API_URL}/users/${userId}`);
      return response.data; // { user_id: 12345, nickname: '홍길동', level: 1 }
    } catch (error) {
      console.error(`[Internal Communication Error] getUser 실패: ${error.message}`);
      throw error;
    }
  },

  async updateUserLevel(userId, newLevel) {
    try {
      await axios.patch(`${INTERNAL_API_URL}/users/${userId}/level`, { level: newLevel });
    } catch (error) {
      console.error(`[Internal Communication Error] updateUserLevel 실패: ${error.message}`);
      throw error;
    }
  },

  async getUserNicknameMap(userIds) {
    try {
      // 대량의 ID 배열을 안전하게 넘기기 위해 POST 바디 활용
      const response = await axios.post(`${INTERNAL_API_URL}/users/nicknames`, { userIds });
      return response.data; // Response 스펙: { "1": "홍길동", "2": "김철수" }
    } catch (error) {
      console.error(`[Internal Error] userService.getUserNicknameMap 실패: ${error.message}`);
      throw error;
    }
  }
};

module.exports = userService;
