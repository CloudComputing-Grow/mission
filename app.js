// app.js
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;
const morgan = require('morgan');
const { initRabbitMQ } = require('./rabbitmq')
const { startUserEventConsumer } = require('./service/consumers/userConsumer');

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// DB 연결 (비즈니스 로직 및 라우터에서 사용)
const db = require('./db/db'); 

// 미션 서비스 전용 레디스 클라이언트 연결
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

// 전역 미들웨어 설정 (로깅 및 파싱)
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis 기반 세션 미들웨어 설정
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// [JWT/인증 검증 미들웨어] 게이트웨이나 토큰에서 유저 정보 추출
app.use((req, res, next) => {
  // 게이트웨이가 JWT를 검증하고 헤더로 유저 ID를 넘겨준다고 가정
  if (req.headers['x-user-id']) {
    req.user = { id: req.headers['x-user-id'] };
  }
  next();
});

// [세션 디버깅 미들웨어] 세션에 변수들이 잘 쌓이는지 확인용
app.use((req, res, next) => {
  if (req.session) {
    console.log(`[User ${req.user?.id || 'Unknown'}] 세션 변수 상태:`, req.session);
  }
  next();
});

// 라우터 등록
const missionRouter = require('./routes/dashboard');
const adminRouter = require('./routes/admin');
//const lastCompleteRouter = require('./routes/last-complete');

app.use('/api/v1/missions', missionRouter);
app.use('/api/v1/admin', adminRouter);
// app.use('/api/v1/last-complete', lastCompleteRouter); 

// 404 에러 처리 미들웨어
app.use((req, res, next) => {
  const error = new Error(`정의되지 않은 엔드포인트입니다: ${req.method} ${req.url}`);
  error.status = 404;
  next(error);
});

// 전역 에러 핸들러 (JSON 응답으로 통일)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '서버 내부 오류가 발생했습니다.',
    // 개발 환경에서만 에러 상세 스택 출력
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

async function startServer() {
  try {
    
    // 서버 켜질 때 RabbitMQ 커넥션 딱 한 번 맺어두기
    await initRabbitMQ(); 

    await startUserEventConsumer();

    app.listen(PORT, () => {
      console.log(`미션 서비스 서버가 포트 ${PORT}에서 정상 작동 중입니다.`);
    });
  } catch (error) {
    console.error('미션 서비스 서버 구동 중 에러 발생:', error);
    process.exit(1); // 초기화 실패 시 서버 종료
  }
}

startServer();

module.exports = app;
