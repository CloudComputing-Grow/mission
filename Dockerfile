# node 버전과 맞춤
FROM node:20-alpine

WORKDIR /app

# [최적화] package.json만 먼저 복사 → 캐시 재사용 최적화
COPY package*.json ./

RUN npm install --production

# 앱 소스 복사
COPY . .

EXPOSE 3001

CMD ["npm", "start"]