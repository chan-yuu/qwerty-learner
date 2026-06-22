#!/bin/bash
cd "$(dirname "$0")"
echo "========================================"
echo "   正在停止 Qwerty Learner 本地服务..."
echo "========================================"

PORT=5173
PID=$(lsof -t -i :$PORT)

if [ -n "$PID" ]; then
  echo "发现端口 $PORT 上有正在运行的服务 (PID: $PID)，正在将其关闭..."
  kill $PID
  echo "服务已成功停止！"
else
  echo "未发现端口 $PORT 上有运行中的 Qwerty Learner 服务。"
fi

sleep 1.5
