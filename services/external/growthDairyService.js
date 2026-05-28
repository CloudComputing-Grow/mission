const axios = require('axios');
const INTERNAL_API_URL = (process.env.API_GATEWAY_URL || 'http://api-gateway') + '/api/internal/v1';

const growthDiaryService = {
  // 최신 나무 성장도 및 수확 상태 조회
  async getLatestTree(userId) {
    try {
      const response = await axios.get(`${INTERNAL_API_URL}/trees/latest`, {
        params: { userId }
      });
      return response.data; // { growth_rate: 40, is_harvested: false }
    } catch (error) {
      console.error(`[Internal Error] growthDiaryService.getLatestTree 실패: ${error.message}`);
      throw error;
    }
  },

  // 인벤토리 서비스에서 뽑은 과일 아이템 정보를 바탕으로, 유저 마당에 나무 심기 요청
  async givePlantedFruit(userId, fruitObj) {
    try {
      await axios.post(`${INTERNAL_API_URL}/users/${userId}/planted-fruits`, {
        userId,
        item_type_id: fruitObj.item_type_id
      });
    } catch (error) {
      console.error(`[Internal Error] growthDiaryService.givePlantedFruit 실패: ${error.message}`);
      throw error;
    }
  },

  // 유저 마당에 심긴 나무 제거/초기화 요청
  async deletePlantedFruit(userId) {
    try {
      await axios.delete(`${INTERNAL_API_URL}/users/${userId}/planted-fruits`);
    } catch (error) {
      console.error(`[Internal Error] growthDiaryService.deletePlantedFruit 실패: ${error.message}`);
      throw error;
    }
  }
};

module.exports = growthDiaryService;
