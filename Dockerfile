FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --silent

COPY . .

RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S slackbot -u 1001

COPY package*.json ./

RUN npm ci --only=production --silent && npm cache clean --force

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/manifest.json ./manifest.json 2>/dev/null || true

RUN chown -R slackbot:nodejs /app
USER slackbot

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD pgrep -f "node.*dist" > /dev/null || exit 1

ENV NODE_ENV=production

CMD ["node", "dist/app.js"]