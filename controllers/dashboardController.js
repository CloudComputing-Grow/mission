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
      const userId = req.user.user_id;
      const missionExecutionId = req.params.mission_execution_id;

      await missionService.confirmMissionExecution(userId, missionExecutionId);
      
      return res.status(200).json({
        success: true,
        message: '미션 완료 확정 성공',
        redirectUrl: '/missions'
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

  async completeMissionByFertilizer(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '[Internal Error] userId가 요청 바디에 누락되었습니다.'
        });
      }

      // 서비스 레이어 호출
      const result = await missionService.completeMissionByFertilizer(userId);

      // 미션 자동 완료 성공 응답
      return res.status(200).json({
        success: true,
        message: '비료 사용으로 인한 미션 자동 완료 처리 성공',
        data: {
          missionExecutionId: result.missionExecutionId
        }
      });

    } catch (err) {
      console.error('[Internal API] 비료 사용 미션 연동 중 에러 발생:', err);
      return res.status(500).json({
        success: false,
        message: err.message || '내부 서버 오류'
      });
    }
  },


  async getExecutionStatus (req, res, next) {
    try {
      const userId = req.headers['x-user-id'];
      const missionExecutionId = parseInt(req.params.missionExecutionId, 10);

      if (!userId || isNaN(missionExecutionId)) {
        return res.status(400).json({
          success: false,
          message: '필수 파라미터 또는 헤더가 누락되었거나 유효하지 않습니다.'
        });
      }
      
      const executionData = await missionService.getExecutionStatus(missionExecutionId, userId);

      if (!executionData) {
        return res.status(404).json({
          success: false,
          message: '해당 미션 수행 이력을 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          missionExecutionId: executionData.mission_execution_id,
          userId: parseInt(executionData.user_id, 10), 
          missionId: executionData.mission_id,
          completed: Boolean(executionData.completed_or_not) // DB의 1/0을 true/false로 변환
        }
      });

    } catch (err) {
      console.error('내부 API 조회 에러:', err);
      next(err); // 전역 에러 핸들러로 위임
    }
  }
};


module.exports = dashboardController;
