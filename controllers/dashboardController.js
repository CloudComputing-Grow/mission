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
      
      // 다음 단계를 고르거나 재도전을 했으므로 보상/모달 잠금장치 세션을 false로 리셋
      if (req.session) {
        req.session.levelRewardGiven = false; // 과일 보상 락 해제
        req.session.prevConfirmedId = null;   // 비료 모달 락 해제
      }

      await new Promise((resolve) => {
        if (req.session) {
          req.session.save(() => resolve());
        } else {
          resolve();
        }
      });

      console.log(`[세션 리셋완료] 옵션: ${option} -> 다음 레벨을 위해 보상 세션 초기화 완료`);

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

  async clearFertilizerModal(req, res) {
    try {
      console.log('--- 모달 클리어 API 호출됨 ---');

      if (req.session) {
        req.session.prevConfirmedId = null;
      }
      
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('세션 저장 실패:', err);
            return reject(err);
          }
          resolve();
        });

	console.log('--- 세션 클리어 및 레디스 저장 완료 ---');
        return res.status(200).json({ success: true, message: '모달 상태 업데이트 완료' });
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
  }
};


module.exports = dashboardController;
