#!/usr/bin/env bash
# 手动部署脚本：本地构建镜像 -> 传输到服务器 -> 重建容器
# 服务器不做任何构建（阿里云容器内访问 npm 源不稳定），依赖全部在本地/CI 打进镜像
# 用法：在项目根目录执行 bash deploy.sh（需要本机 Docker Desktop 运行中）
set -euo pipefail

SERVER="root@101.201.103.63"
REMOTE_DIR="/www/wwwroot/my-blog"

echo "==> 本地构建镜像 (linux/amd64)"
docker build --platform linux/amd64 -t codeart-blog:latest .

echo "==> 导出并传输镜像到 $SERVER"
docker save codeart-blog:latest | gzip | ssh "$SERVER" "docker load"

echo "==> 同步文章与 compose 配置"
tar -czf /tmp/blog-files.tgz \
  --exclude='./node_modules' \
  --exclude='./client/node_modules' \
  --exclude='./server/node_modules' \
  --exclude='./client/dist' \
  --exclude='./.git' \
  --exclude='./.deploy' \
  --exclude='./.env' \
  --exclude='./.github' \
  -C . docker-compose.yml content 2>/dev/null
ssh "$SERVER" "mkdir -p $REMOTE_DIR"
ssh "$SERVER" "tar -xzf - -C $REMOTE_DIR" < /tmp/blog-files.tgz

echo "==> 重建容器"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose up -d --force-recreate && docker image prune -f"

echo "==> 部署完成：https://study.work-tong.cn"
