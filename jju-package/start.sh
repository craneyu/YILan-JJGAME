#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== 柔術競賽演武計分平台 - Docker 部署 ==="

# 載入映像檔
echo "[1/3] 載入 Docker 映像檔..."
docker load -i jju-docker-images.tar.gz

# 停止舊容器（若有）
echo "[2/3] 停止舊容器..."
docker compose down 2>/dev/null || true

# 啟動服務
echo "[3/3] 啟動服務..."
docker compose up -d

echo ""
echo "=== 啟動完成 ==="
echo "  前端: http://localhost:4200"
echo "  資料庫: MongoDB (Docker 內部)"
echo ""
echo "  停止服務: docker compose down"
echo "  查看日誌: docker compose logs -f"
