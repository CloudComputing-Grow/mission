// config/redis.js
const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// 레디스 클라이언트 생성
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

// 연결 이벤트 리스너 등록 (에러 모니터링을 위해 필수!)
redisClient.on('connect', () => console.log('Redis 연결 성공'));
redisClient.on('error', (err) => console.error('Redis 연결 에러:', err));

// 서버 시작 시 연결 수행
redisClient.connect().catch(console.error);

module.exports = redisClient;
