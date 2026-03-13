#!/bin/bash
# 打包 Docker 映像供 Synology Container Manager GUI 匯入使用
# 產出三個獨立 .tar 檔（可逐一透過 Container Manager 匯入）

set -e

DATE=$(date +%Y%m%d-%H%M)
PACKAGE_DIR="synology-package"
OUTPUT_FILE="synology-${DATE}.zip"

echo "=== 柔術競賽平台 Synology 打包腳本 ==="
echo ""

# 確認 Docker 已啟動
if ! docker info > /dev/null 2>&1; then
  echo "錯誤：Docker 未啟動，請先開啟 Docker Desktop"
  exit 1
fi

# 確認映像存在
for img in yilan-jju-frontend yilan-jju-backend "mongo:7"; do
  if ! docker image inspect "$img" > /dev/null 2>&1; then
    echo "錯誤：找不到映像 $img，請先執行 docker compose up --build"
    exit 1
  fi
done

# 建立暫存目錄
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# 分別匯出三個映像（Container Manager GUI 需要獨立 .tar 檔）
echo "[1/4] 匯出 frontend 映像..."
docker save yilan-jju-frontend -o "$PACKAGE_DIR/frontend.tar"
echo "      完成（$(du -sh "$PACKAGE_DIR/frontend.tar" | cut -f1)）"

echo "[2/4] 匯出 backend 映像..."
docker save yilan-jju-backend -o "$PACKAGE_DIR/backend.tar"
echo "      完成（$(du -sh "$PACKAGE_DIR/backend.tar" | cut -f1)）"

echo "[3/4] 匯出 mongo 映像..."
docker save mongo:7 -o "$PACKAGE_DIR/mongo.tar"
echo "      完成（$(du -sh "$PACKAGE_DIR/mongo.tar" | cut -f1)）"

# 複製 Synology 專用 docker-compose.yml
cp synology/docker-compose.yml "$PACKAGE_DIR/docker-compose.yml"

# 壓縮為 zip（File Station 可直接解壓）
echo "[4/4] 壓縮打包..."
zip -r "$OUTPUT_FILE" "$PACKAGE_DIR" -q
rm -rf "$PACKAGE_DIR"

# 顯示結果
SIZE=$(du -sh "$OUTPUT_FILE" | cut -f1)
echo ""
echo "=== 打包完成！==="
echo "  檔案：$OUTPUT_FILE"
echo "  大小：$SIZE"
echo ""
echo "請參閱 synology/MANUAL.md 進行後續 NAS 部署步驟。"
