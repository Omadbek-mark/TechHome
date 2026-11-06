FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3002 UPLOADS_ROOT=/app/uploads
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./
RUN mkdir uploads && chown node:node uploads
USER node
EXPOSE 3002
HEALTHCHECK --interval=15s --timeout=4s --start-period=25s --retries=3 \
  CMD node -e 'fetch("http://127.0.0.1:"+process.env.PORT+"/ready",{signal:AbortSignal.timeout(2500)}).then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>{process.exitCode=1})'
CMD ["node", "dist/server.js"]
