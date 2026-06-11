// config/redis.js
const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

// 레디스 클라이언트 생성
const redisClient = createClient({
    url: `redis://${redisHost}:${redisPort}`,
    // 재연결 전략 설정 (네트워크 순단이나 Redis 재부팅 대비)
    socket: {
        connectTimeout: 1000

        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error(` [Redis] 최대 재연결 시도(10회) 초과. 재시도를 중지합니다.`);
                return false; // 재연결 포기 (프로세스는 죽지 않음)
            }
            // 재시도 횟수가 늘어날수록 대기 시간을 늘림 (최대 3초)
            const delay = Math.min(retries * 500, 3000);
            console.warn(`⚠️ [Redis] 연결이 끊김. ${delay}ms 후 재연결 시도... (시도 횟수: ${retries}/10)`);
            return delay;
        }
    }
});

redisClient.on('ready', () => {
    console.log(` [Redis] 연결 및 명령 처리 준비 완료 (${redisHost}:${redisPort})`);
});

redisClient.on('error', (err) => {
    console.error(' [Redis 에러 발생]:', err.message);
});

// 초기 연결 실행 (어플리케이션 시작 시 최초 1회)
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('[Redis] 초기 연결 시도 중 예외 발생');
    }
})();

module.exports = redisClient;
