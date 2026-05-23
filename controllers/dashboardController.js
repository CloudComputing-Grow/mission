// controllers/dashboardController.js
const missionService = require('../services/missionService');

const dashboardController = {
  async getDashboard(req, res) {
    try {
      const userId = req.user.user_id; 
      const missionId = req.query.missionId;

      const { mission, result } = await missionService.getDashboardData(userId, missionId);

      return res.status(200).json({ success: true, data: { mission, result } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '대시보드 조회 실패' });
    }
  },

  async submitMission(req, res) {
    try {
      const userId = req.user.user_id;
      const missionId = parseInt(req.body.missionId);
      const filename = req.file ? req.file.filename : null;

      await missionService.submitMission(userId, missionId, filename);

      return res.status(201).json({
        success: true,
        message: '미션 제출 완료',
        redirectUrl: '/dashboard/mission' // 프론트엔드가 읽어서 push할 경로
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '미션 제출 실패' });
    }
  },

  async confirmMission(req, res) {
    try {
      const userId = req.user.user_id;
      const missionExecutionId = req.params.mission_execution_id;

      await missionService.confirmMissionExecution(userId, missionExecutionId);

      return res.status(200).json({
        success: true,
        message: '미션 완료 확정 성공',
        redirectUrl: '/dashboard/mission'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '미션 완료 확정 실패' });
    }
  },

  async getMissionList(req, res) {
    try {
      const userId = req.user.user_id;
      const data = await missionService.getMissionListData(userId);

      return res.status(200).json({
        success: true,
        data: {
          missions: data.missions,
          certStatus: data.certStatus,
          nickname: data.nickname,
          currentLevel: data.currentLevel,
          showFertilizerModal: data.showFertilizerModal,
          latestMissionExecutionId: data.latestMissionExecutionId,
          showLevelOptionModal: data.showLevelOptionModal
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '미션 목록 조회 실패' });
    }
  },

  async postLevelOption(req, res) {
    try {
      const userId = req.user.user_id;
      const { option } = req.body;

      const { redirect } = await missionService.processLevelOption(userId, option);

      return res.status(200).json({
        success: true,
        message: `레벨 옵션(${option}) 처리 성공`,
        redirectUrl: redirect
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '레벨 옵션 처리 실패' });
    }
  },

  async useFertilizer(req, res) {
    try {
      const userId = req.user.user_id;
      await missionService.useFertilizer(userId);

      return res.status(200).json({
        success: true,
        message: '비료 사용 성공',
        redirectUrl: '/home'
      });
    } catch (err) {
      console.error('🔥 비료 사용 중 오류:', err);
      return res.status(400).json({ success: false, message: err.message || '비료 사용 중 오류 발생' });
    }
  }
};

module.exports = dashboardController;
