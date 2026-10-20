# --- 1단계: 빌드 스테이지 ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web
RUN test -s /app/dist/index.html

# --- 2단계: 서빙 스테이지 ---
FROM nginx:alpine

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# 권한 부여
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]