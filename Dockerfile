FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production SERVE_STATIC=false PORT=3000 DATA_DIR=/data
USER node
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server/index.js"]
