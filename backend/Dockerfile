# CampusKart backend (Node/Express). Used by ../docker-compose.yml and can be deployed as-is to Render/Railway.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
# --chown: the app runs as the unprivileged "node" user, so it must be able to read files copied with restrictive host permissions
COPY --chown=node:node src ./src
EXPOSE 5000
USER node
CMD ["node", "src/index.js"]
