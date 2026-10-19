# --- 1단계: 빌드 스테이지 (Node.js 환경에서 Expo 웹 빌드) ---
FROM node:18-alpine AS builder

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm install

# 소스코드 전체 복사 후 웹 빌드 실행
COPY . .
RUN npx expo export --platform web

# --- 2단계: 서빙 스테이지 (Nginx로 가볍게 배포) ---
FROM nginx:alpine

# 1단계 빌드 결과물(정적 파일)을 Nginx의 웹 디렉토리로 복사
# (최신 Expo 기준 빌드 폴더명은 dist 입니다)
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 기본 포트 개방
EXPOSE 80

# Nginx 포그라운드 실행
CMD ["nginx", "-g", "daemon off;"]