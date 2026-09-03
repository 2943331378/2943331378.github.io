# ===== 构建阶段：构建前端 =====
# NPM_REGISTRY: 国内服务器构建时传 npmmirror 镜像源
ARG NPM_REGISTRY=https://registry.npmjs.org

FROM node:20-alpine AS build
ARG NPM_REGISTRY
WORKDIR /app
RUN npm config set registry $NPM_REGISTRY
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY client/ client/
RUN npm run build

# ===== 运行阶段：仅 server 依赖 + 构建产物 + 内容 =====
FROM node:20-alpine
ARG NPM_REGISTRY
WORKDIR /app
ENV NODE_ENV=production
RUN npm config set registry $NPM_REGISTRY
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --omit=dev --workspace server
COPY server/ server/
COPY content/ content/
COPY --from=build /app/client/dist client/dist
EXPOSE 3001
CMD ["node", "server/src/index.js"]
