const axios = require('axios');
const INTERNAL_API_URL = (process.env.INVENTORY_SERVICE_URL || 'http://inventory-market:3004') + '/api/internal/v1';

const inventoryService = {
  // 아이템/인벤토리 서비스에서 랜덤 과일 item_type_id 획득
  async getRandomFruit() {
    try {
      const response = await axios.get(`${INTERNAL_API_URL}/fruits/random`);
      return response.data; // { item_type_id: 2 } 형태 객체 반환
    } catch (error) {
      console.error(`[Internal Error] inventoryService.getRandomFruit 실패: ${error.message}`);
      throw error;
    }
  },

  // 유저 비료 보상 회수
  async revokeFertilizer(userId) {
    try {
      await axios.post(`${INTERNAL_API_URL}/items/revoke-fertilizer`, {
        userId
      });
      // 성공 시 200 OK (반환 데이터 없음)
    } catch (error) {
      console.error(`[Internal Error] inventoryService.revokeFertilizer 실패: ${error.message}`);
      throw error;
    }
  }
};

module.exports = inventoryService;
