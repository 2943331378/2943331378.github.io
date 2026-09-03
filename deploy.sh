#!/usr/bin/env bash
# 手动部署脚本：打包本地产物 -> 上传服务器 -> 重建容器
# 用法：在项目根目录执行 bash deploy.sh
set -euo pipefail

SERVER="root@101.201.103.63"
REMOTE_DIR="/www/wwwroot/my-blog"

echo "==> 打包（排除 node_modules/dist/git/.env）"
tar -czf /tmp/blog-deploy.tgz \
  --exclude='./node_modules' \
  --exclude='./client/node_modules' \
  --exclude='./server/node_modules' \
  --exclude='./client/dist' \
  --exclude='./.git' \
  --exclude='./.deploy' \
  --exclude='./.env' \
  -C . . 2>/dev/null

echo "==> 上传到 $SERVER:$REMOTE_DIR"
ssh "$SERVER" "mkdir -p $REMOTE_DIR"
ssh "$SERVER" "tar -xzf - -C $REMOTE_DIR" < /tmp/blog-deploy.tgz

echo "==> 服务器重建容器"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose up -d --build && docker image prune -f"

echo "==> 部署完成：https://study.work-tong.cn"
