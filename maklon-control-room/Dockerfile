FROM node:20-alpine

WORKDIR /app

# Salin package.json backend
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Salin source server dan static web
COPY server/ ./server/
COPY web/ ./web/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV SERVE_STATIC=true

EXPOSE 3000

CMD ["node", "server/index.js"]
