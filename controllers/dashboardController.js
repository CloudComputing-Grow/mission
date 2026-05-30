// controllers/dashboardController.js
const missionService = require('../services/missionService');

const dashboardController = {
  async getDashboard(req, res) {
    try {
      req.user = { user_id: 2 }; // 테스트용
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
      req.user = { user_id: 2 }; // 테스트용
      const userId = req.user.user_id;
      const missionId = parseInt(req.body.missionId);
      const imageUrl = req.file ? req.file.gcsUrl : null;

      await missionService.submitMission(userId, missionId, imageUrl);

      return res.status(201).json({
        success: true,
        message: '미션 제출 완료',
        redirectUrl: '/missions'
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '미션 제출 실패' });
    }
  },

  async confirmMission(req, res) {
    try {
      req.user = { user_id: 2 }; // 테스트용
      const userId = req.user.user_id;
      const missionExecutionId = req.params.mission_execution_id;

      await missionService.confirmMissionExecution(userId, missionExecutionId);
      
      if (!req.session) {
        req.session = {};
      }
      req.session.prevConfirmedId = Number(missionExecutionId);
      req.session.fertilizerUsed = false;
      
      req.session.save((err) => {
        if (err) {
          console.error('레디스 세션 저장 에러:', err);
          return res.status(500).json({ success: false, message: '세션 저장 실패' });
        }

        console.log(`[레디스 저장완료] 세션 키 등록 완료! ID: ${missionExecutionId}`);

        return res.status(200).json({
          success: true,
          message: '미션 완료 확정 성공',
          redirectUrl: '/missions'
        });
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: '미션 완료 확정 실패' });
    }
  },

  async getMissionList(req, res) {
    try {
      req.user = { user_id: 2 }; // 테스트용
      const userId = req.user.user_id;
      const data = await missionService.getMissionListData(userId, req.session);

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
      req.user = { user_id: 2 }; // 테스트용
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
  }
};


module.exports = dashboardController;
