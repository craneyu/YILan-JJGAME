#!/bin/bash
# 打包 Docker 映像為可攜式壓縮包（適用 M4 MacBook Air）

set -e

PACKAGE_DIR="jju-package"
OUTPUT_FILE="jju-docker.tar.gz"

echo "=== 柔術競賽平台 Docker 打包腳本 ==="
echo ""

# 建立暫存目錄
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# 匯出映像
echo "[1/3] 匯出 Docker 映像（約需 1-2 分鐘）..."
docker save yilan-jju-frontend yilan-jju-backend mongo:7 | gzip > "$PACKAGE_DIR/images.tar.gz"
echo "      映像匯出完成"

# 產生部署用 docker-compose.yml（使用 image: 而非 build:）
echo "[2/3] 產生設定檔..."
cat > "$PACKAGE_DIR/docker-compose.yml" << 'EOF'
services:
  frontend:
    image: yilan-jju-frontend
    platform: linux/arm64
    ports:
      - "4200:80"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: yilan-jju-backend
    platform: linux/arm64
    ports:
      - "3000:3000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/jju
      - JWT_SECRET=jju_secret_change_in_production
      - PORT=3000
      - NODE_ENV=production
    depends_on:
      mongo:
        condition: service_healthy
    restart: unless-stopped

  mongo:
    image: mongo:7
    platform: linux/arm64
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mongo_data:
EOF

# 建立匯入腳本
cat > "$PACKAGE_DIR/start.sh" << 'EOF'
#!/bin/bash
# 在 MacBook Air M4 上執行此腳本即可啟動系統

set -e

echo "=== 柔術競賽平台啟動腳本 ==="
echo ""

# 確認 Docker 已啟動
if ! docker info > /dev/null 2>&1; then
  echo "錯誤：Docker 未啟動，請先開啟 Docker Desktop"
  exit 1
fi

# 載入映像（如果尚未載入）
if ! docker image inspect yilan-jju-frontend > /dev/null 2>&1; then
  echo "[1/2] 載入 Docker 映像（首次執行需要約 2-3 分鐘）..."
  docker load < images.tar.gz
  echo "      映像載入完成"
else
  echo "[1/2] 映像已存在，跳過載入"
fi

# 啟動服務
echo "[2/2] 啟動所有服務..."
docker compose up -d

echo ""
echo "✅ 啟動完成！"
echo ""
echo "   前端：http://localhost:4200"
echo "   後端：http://localhost:3000"
echo ""
echo "預設帳號："
echo "   管理員：admin / admin123"
echo "   計分裁判：judge1~judge5 / judge123"
echo "   VR 裁判：vr / vr123"
echo "   賽序裁判：seq / seq123"
echo "   觀眾：audience / audience123"
echo ""
echo "停止服務：docker compose down"
echo "查看日誌：docker compose logs -f"
EOF

chmod +x "$PACKAGE_DIR/start.sh"
echo "      設定檔產生完成"

# 壓縮整個目錄
echo "[3/3] 壓縮打包..."
tar -czf "$OUTPUT_FILE" "$PACKAGE_DIR"
rm -rf "$PACKAGE_DIR"

# 顯示結果
SIZE=$(du -sh "$OUTPUT_FILE" | cut -f1)
echo ""
echo "=== 打包完成！==="
echo "  檔案：$OUTPUT_FILE"
echo "  大小：$SIZE"
echo ""
echo "傳輸到 MacBook Air 後，執行："
echo "  tar -xzf jju-docker.tar.gz"
echo "  cd jju-package"
echo "  ./start.sh"
