// services/missionService.js

const missionModel = require('../models/missionModel');
const certModel = require('../models/certificationModel');
const missionExecutionModel = require('../models/missionExecutionModel');
const levelOptionModel = require('../models/levelOptionModel');
const { getChannel } = require('./rabbitmq');
const redisClient = require('../config/redis');

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

/**
 * Redis 장애 대응을 위한 안전한 Redis 래퍼 객체 (Safe Redis Shield)
 * Redis가 다운되어 에러가 발생해도, 어플리케이션이 크래시되지 않고 로그만 남긴 뒤
 * 기본값(null 또는 false)을 반환하여 메인 서비스가 계속 작동하도록 방어합니다.
 */
const safeRedis = {
  async get(key) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error(`[Redis 장애 - GET 에러] Key: ${key}. 서비스 지속을 위해 null 처리합니다.`, error);
      return null;
    }
  },
  async set(key, value) {
    try {
      return await redisClient.set(key, value);
    } catch (error) {
      console.error(`[Redis 장애 - SET 에러] Key: ${key}. 작업을 건너뜁니다.`, error);
      return null;
    }
  },
  async setEx(key, seconds, value) {
    try {
      return await redisClient.setEx(key, seconds, value);
    } catch (error) {
      console.error(`[Redis 장애 - SETEX 에러] Key: ${key}. 작업을 건너뜁니다.`, error);
      return null;
    }
  },
  async del(key) {
    try {
      return await redisClient.del(key);
    } catch (error) {
      console.error(`[Redis 장애 - DEL 에러] Key: ${key}. 작업을 건너뜁니다.`, error);
      return null;
    }
  }
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
        console.warn(`[경고] 메시지 버퍼 가득 참: ${missionExecutionId}`);
      }

      console.log(`[미션 서비스] 완료 이벤트 발행 성공: ${missionExecutionId}`);
      
      // 다음 화면에서 비료 지급 모달을 띄우기 위해 Redis에 임시 저장 (만료시간 1분)
      const redisKey = `mission:user:${userId}:pending-confirm`;
      await safeRedis.setEx(redisKey, 60, String(missionExecutionId));
      console.log(`[미션 서비스] Redis 팝업 데이터 저장 시도 완료: ${redisKey}`);

    } catch (error) {
      console.error('[미션 서비스] 처리 중 에러 발생:', error);
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
    
    const pendingConfirmKey = `mission:user:${userId}:pending-confirm`;
    const fertilizerUsedKey = `mission:user:${userId}:fertilizer-used`;

    const [prevConfirmedId, fertilizerUsed] = await Promise.all([
      safeRedis.get(pendingConfirmKey),
      safeRedis.get(fertilizerUsedKey)
    ]);

    certDetails.forEach(c => {
      certStatus[c.mission_id] = {
        status: c.checked === 1 && c.confirmed_by_user === 1,
        date: c.certification_date,
        mission_execution_id: c.mission_execution_id,
        awaitingConfirm: c.checked === 1 && c.confirmed_by_user === 0
      };

      if (c.confirmed_by_user === 1 && Number(prevConfirmedId) === c.mission_execution_id && !fertilizerUsed) {
        showFertilizerModal = true;
        latestMissionExecutionId = c.mission_execution_id;
      }
    });

    // 데이터를 읽었으므로 일회성 플래그 삭제 (Flash 세션 효과)
    if (prevConfirmedId) {
      await safeRedis.del(pendingConfirmKey);
    }

    const currentMissions = mList.filter(m => m.level === currentLevel);
    const clearedMissions = currentMissions.filter(m => certStatus[m.mission_id]?.status);

    const treeRow = await externalServiceClient.getLatestTree(userId);
    const hasFullyGrownTree = treeRow && !treeRow.is_harvested && treeRow.growth_rate >= 100;

    let showLevelOptionModal = !showFertilizerModal && (clearedMissions.length === 5) && !hasFullyGrownTree;

    if (treeRow && treeRow.is_harvested && clearedMissions.length === 5) {
      showLevelOptionModal = true;
    }

    const prevOption = await levelOptionModel.getLatestOption(userId);
    if (prevOption && prevOption.selected_option === 'NEXT') {
      showLevelOptionModal = false;
    }

    const growthRate = treeRow?.growth_rate || 0;
    const inferredCompleted = Math.floor(growthRate / 20);
    const missionCompleted = Math.max(clearedMissions.length, inferredCompleted);

    // 과일 지급 로직 (외부 서비스 조합)
    // 과일 보상 중복 수령 방지도 Redis 캐시나 외부 서비스 이력으로 체크
    const rewardGivenKey = `mission:user:${userId}:level-reward-given`;
    const isRewardGiven = await safeRedis.get(rewardGivenKey);

    if (missionCompleted >= 5 && !isRewardGiven) {
      const executions = await missionExecutionModel.getCompletedDatesByLevel(userId, currentLevel);
      if (executions.length >= 5) {
        const start = new Date(executions[0].completed_date);
        const end = new Date(executions[4].completed_date);
        if ((end - start) / (1000 * 60 * 60 * 24) <= 10) {
          const fruitRes = await externalServiceClient.getRandomFruit();

          try {
            // 과일 심기 API 호출
            await externalServiceClient.givePlantedFruit(userId, {
              item_type_id: fruitRes.data.itemTypeId
            });

            // 성공 시 레디스에 기록
	    await safeRedis.set(rewardGivenKey, 'true');

          } catch (error) {
            if (error.response?.status === 409) {
              console.warn(`[409 예외 우회] 유저 ${userId}는 이미 나무를 발급받았습니다. Redis 상태 동기화를 시도합니다.`);
              await safeRedis.set(rewardGivenKey, 'true');
            } else {
              throw error;
            }
          }
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
      showLevelOptionModal
    };
  },

  async processLevelOption(userId, option) {
    await levelOptionModel.deleteOptionsByUserId(userId);
    await levelOptionModel.insertOption(userId, option);
    
    // 레벨 옵션 변경 시 관련 Redis 플래그들 초기화
    await safeRedis.del(`mission:user:${userId}:level-reward-given`);
    await safeRedis.del(`mission:user:${userId}:pending-confirm`);

    if (option === 'NEXT') {
      const user = await externalServiceClient.getUser(userId);
      if (user.level === 8) return { redirect: '/last-complete' };
      
      await levelOptionModel.deleteOptionsByUserId(userId);

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
      
      await externalServiceClient.deletePlantedFruit(userId);
    }

    return { redirect: '/home' };
  },
  
  async deleteUserMissionData(userId) {
    const executionIds = await missionExecutionModel.getExecutionIdsByUserId(userId);

    if (executionIds && executionIds.length > 0) {
      await certModel.deleteCertificationsInExecutionIds(executionIds);
      await missionExecutionModel.deleteExecutionsInIds(executionIds);
    }
    
    await levelOptionModel.deleteOptionsByUserId(userId);

    console.log(`[미션 서비스] 유저 ${userId}의 모든 미션 관련 데이터 삭제 완료`);
  },

  async completeMissionByFertilizer(userId) {
    const user = await externalServiceClient.getUser(userId);
    const availableMission = await missionModel.getAvailableMissionForUser(userId, user.level);

    if (!availableMission) {
      return { success: false, message: "진행 가능한 미션이 없습니다." };
    }

    const execution = await missionExecutionModel.createExecutionWithDate(
      availableMission.mission_id,
      userId,
      true
    );

    await certModel.saveCertification({
      mission_execution_id: execution.mission_execution_id,
      user_id: userId,
      image_source: 'FERTILIZER_AUTO_COMPLETE', 
      checked: 1,          
      confirmed_by_user: 1  
    });

    // 대시보드(getMissionListData)와의 상태 싱크를 위한 Redis 세팅
    const fertilizerUsedKey = `mission:user:${userId}:fertilizer-used`;
    const pendingConfirmKey = `mission:user:${userId}:pending-confirm`;

    await Promise.all([
      safeRedis.setEx(fertilizerUsedKey, 60, 'true'),
      safeRedis.setEx(pendingConfirmKey, 60, String(execution.mission_execution_id))
    ]);

    return {
      success: true,
      missionExecutionId: execution.mission_execution_id
    };
  },

  async getExecutionStatus(missionExecutionId, userId) {
    const execution = await missionExecutionModel.findExecutionById(missionExecutionId);

    if (!execution) return null;

    if (String(execution.user_id) !== String(userId)) {
      throw new Error('유저 식별 정보가 일치하지 않습니다.');
    }

    return execution;
  }
};

module.exports = missionService;
