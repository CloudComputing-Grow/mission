const { getChannel } = require('../rabbitmq');
const missionService = require('../missionService');

async function startUserEventConsumer() {
  try {
    const channel = getChannel();

    const exchangeName = 'user.events';
    const exchangeType = 'topic';
    const queueName = 'mission-service.user-events.queue';
    const routingKey = 'user.deleted';

    await channel.assertExchange(exchangeName, exchangeType, { durable: true });
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);

    console.log(`[미션 서비스] 회원탈퇴 이벤트 구독 완료`);

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const eventData = JSON.parse(msg.content.toString());

          if (eventData.eventType === 'UserDeleted') {
            const { userId } = eventData;
            await missionService.deleteUserMissionData(userId)
          }

          channel.ack(msg);

        } catch (error) {
          console.error('[미션 서비스] 회원탈퇴 이벤트 처리 중 에러 발생:', error);
          channel.nack(msg, false, true);
        }
      }
    });

  } catch (error) {
    console.error('User Consumer 기동 실패:', error);
  }
}

module.exports = { startUserEventConsumer };
