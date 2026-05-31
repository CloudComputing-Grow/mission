// rabbitmq.js (연결을 싱글톤처럼 관리)
const amqp = require('amqplib');

let channel = null;

async function initRabbitMQ() {
  if (channel) return channel;
  try {

    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost';

    console.log(`RabbitMQ 연결 시도 중... 주소: ${rabbitmqUrl}`);
    const connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    await channel.assertExchange('grow.mission.fanout', 'fanout', { durable: true });
    
    console.log('RabbitMQ 연결 성공 및 Exchange 선언 완료');
    return channel;
  } catch (error) {
    console.error('RabbitMQ 연결 실패:', error);
    throw error;
  }
}

function getChannel() {
  if (!channel) throw new Error('RabbitMQ 채널이 초기화되지 않았습니다.');
  return channel;
}

module.exports = { initRabbitMQ, getChannel };
