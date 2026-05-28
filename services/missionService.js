// services/missionService.js

const missionModel = require('../models/missionModel');
const certModel = require('../models/certificationModel');
const missionExecutionModel = require('../models/missionExecutionModel');
const levelOptionModel = require('../models/levelOptionModel');
const { getChannel } = require('./rabbitmq');

const userService = require('./external/userService');
const inventoryService = require('./external/inventoryService');
const growthDiaryService = require('./external/growthDiaryService');

const externalServiceClient = {
  getUser: userService.getUser,
  updateUserLevel: userService.updateUserLevel,
  getLatestTree: growthDiaryService.getLatestTree,          // To. 성장 서비스
  getRandomFruit: inventoryService.getRandomFruit,          // To. 인벤토리 서비스
  givePlantedFruit: growthDiaryService.givePlantedFruit,    // To. 성장 서비스
  deletePlantedFruit: growthDiaryService.deletePlantedFruit  // To. 성장 서비스
};

const missionService = {
  async getDashboardData(userId, queryMissionId) {
    const user = await externalServiceClient.getUser(userId);
    const allMissions = await missionModel.getAllMissions();
    const certifications = await certModel.getCertificationsByUser(userId);
    
    const completedIds = certifications.map(c => c.mission_id);
    const nextMission = allMissions.find(m => !completedIds.includes(m.mission_id));
    const result = certifications.find(c => c.mission_id === nextMission?.mission_id);

    let mission = null;
    if (queryMissionId) {
      mission = await missionModel.getMissionById(queryMissionId);
    } else {
      mission = nextMission || null;
    }

    return { mission, result: result || null };
  },

  async submitMission(userId, missionId, imageUrl) {
    const missionExecutionId = await missionExecutionModel.createExecution(missionId, userId, false);
    await certModel.saveCertification({
      mission_execution_id: missionExecutionId,
      user_id: userId,
      image_source: imageUrl
    });
  },

  async confirmMissionExecution(userId, missionExecutionId) {
    try {
      // 내부 미션/인증 데이터 업데이트
      await certModel.updateConfirmation(missionExecutionId, userId);
      await missionExecutionModel.updateExecutionToComplete(missionExecutionId);

      // 미리 싱글톤으로 열려있는 글로벌 채널 가져오기
      const channel = getChannel();
      const exchangeName = 'grow.mission.fanout';

      // 이벤트 메시지 작성
      const eventPayload = {
        userId,
        missionExecutionId,
        timestamp: new Date().toISOString()
      };

      // 메시지 발행
      const isSent = channel.publish(
        exchangeName,
        '',
        Buffer.from(JSON.stringify(eventPayload)),
        { persistent: true }
      );

      if (!isSent) {
        // RabbitMQ 내부 버퍼가 가득 찼을 때의 예외 처리
        console.warn(`[경고] 메시지 버퍼 가득 참: ${missionExecutionId}`);
      }

      console.log(`[미션 서비스] 완료 이벤트 발행 성공: ${missionExecutionId}`);

    } catch (error) {
      console.error('[미션 서비스] 처리 중 에러 발생:', error);
      // 여기서 필요하다면 DB 롤백 로직을 태우거나 에러를 상위로 던짐
      throw error;
    }
  },

  async getMissionListData(userId, session) {
    const userInfo = await externalServiceClient.getUser(userId);
    const currentLevel = userInfo.level;

    const mList = await missionModel.getMissionsByLevel(currentLevel);
    const certDetails = await certModel.getCertStatusDetails(userId);

    const certStatus = {};
    let showFertilizerModal = false;
    let latestMissionExecutionId = null;

    certDetails.forEach(c => {
      certStatus[c.mission_id] = {
        status: c.checked === 1 && c.confirmed_by_user === 1,
        date: c.certification_date,
        mission_execution_id: c.mission_execution_id,
        awaitingConfirm: c.checked === 1 && c.confirmed_by_user === 0
      };

      if (c.confirmed_by_user === 1 && session.prevConfirmedId === c.mission_execution_id && !session.fertilizerUsed) {
        showFertilizerModal = true;
        latestMissionExecutionId = c.mission_execution_id;
      }
    });

    const currentMissions = mList.filter(m => m.level === currentLevel);
    const clearedMissions = currentMissions.filter(m => certStatus[m.mission_id]?.status);

    const treeRow = await externalServiceClient.getLatestTree(userId);
    const hasFullyGrownTree = treeRow && !treeRow.is_harvested && treeRow.growth_rate >= 100;

    let showLevelOptionModal = !showFertilizerModal && (clearedMissions.length === 5 || hasFullyGrownTree);

    // 1. 이미 NEXT를 선택했는지 내부 DB 체크
    const prevOption = await levelOptionModel.getLatestOption(userId);
    if (prevOption && prevOption.selected_option === 'NEXT') {
      showLevelOptionModal = false;
    }

    // 2. 외부 트리 정보 기반 체크 (비료 수확 예외)
    if (!showLevelOptionModal && treeRow) {
      if (treeRow.is_harvested && treeRow.growth_rate === 100) {
        showLevelOptionModal = true;
      }
    }

    const growthRate = treeRow?.growth_rate || 0;
    const inferredCompleted = Math.floor(growthRate / 20);
    const missionCompleted = Math.max(clearedMissions.length, inferredCompleted);

    // 과일 지급 로직 (외부 서비스 조합)
    let rewardGivenThisTurn = false;
    if (missionCompleted >= 5 && !session.levelRewardGiven) {
      const executions = await missionExecutionModel.getCompletedDatesByLevel(userId, currentLevel);
      if (executions.length >= 5) {
        const start = new Date(executions[0].completed_date);
        const end = new Date(executions[4].completed_date);
        if ((end - start) / (1000 * 60 * 60 * 24) <= 10) {
          const randomFruit = await externalServiceClient.getRandomFruit();
          await externalServiceClient.givePlantedFruit(userId, randomFruit);
          rewardGivenThisTurn = true;
        }
      }
    }

    return {
      missions: mList,
      certStatus,
      nickname: userInfo.nickname,
      currentLevel: `${currentLevel}단계`,
      showFertilizerModal,
      latestMissionExecutionId,
      showLevelOptionModal,
      rewardGivenThisTurn
    };
  },

  async processLevelOption(userId, option) {
    await levelOptionModel.deleteOptionsByUserId(userId);
    await levelOptionModel.insertOption(userId, option);

    if (option === 'NEXT') {
      const user = await externalServiceClient.getUser(userId);
      if (user.level === 8) return { redirect: '/last-complete' };

      await externalServiceClient.updateUserLevel(userId, user.level + 1);
      await externalServiceClient.deletePlantedFruit(userId);
      return { redirect: '/home' };
    } 
    
    if (option === 'RETRY') {
      const user = await externalServiceClient.getUser(userId);
      const executionIds = await missionExecutionModel.getExecutionIdsByLevel(userId, user.level);
      
      if (executionIds.length > 0) {
        await certModel.deleteCertificationsInExecutionIds(executionIds);
        await missionExecutionModel.deleteExecutionsInIds(executionIds);
      }

      const randomFruit = await externalServiceClient.getRandomFruit();
      await externalServiceClient.givePlantedFruit(userId, randomFruit);
    }

    return { redirect: '/dashboard/mission' };
  }

};

module.exports = missionService;
