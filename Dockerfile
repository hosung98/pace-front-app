# --- 1단계: 빌드 스테이지 ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx expo export --platform web

# --- 2단계: 서빙 스테이지 ---
FROM nginx:alpine

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# ★ 추가된 부분: Nginx 라우팅 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]