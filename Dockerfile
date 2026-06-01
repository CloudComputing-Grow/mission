FROM node:20-alpine

WORKDIR /app

# 보안 및 성능을 위한 운영 환경 설정
ENV NODE_ENV=production

# [최적화] package.json만 먼저 복사 → 캐시 재사용
COPY package*.json ./

# 운영 환경에 필요한(devDependencies를 제외한) 패키지만 설치
RUN npm ci --omit=dev

# 앱 소스 전체 복사
COPY . .

EXPOSE 3003

# 운영 환경용 스크립트 실행
CMD ["npm", "start"]
