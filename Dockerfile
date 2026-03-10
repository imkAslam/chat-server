FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5030

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5030/health',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{const j=JSON.parse(d);process.exit(j.status==='ok'?0:1)})})"

CMD ["node", "src/server.js"]
