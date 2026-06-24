#!/bin/bash
# 打包 Docker 映像為可攜式壓縮包（適用 M4 MacBook Air）

set -e

DATE=$(date +%Y%m%d-%H%M)
PACKAGE_DIR="jju-package"
OUTPUT_FILE="jju-docker-${DATE}.tar.gz"

echo "=== 柔術競賽平台 Docker 打包腳本 ==="
echo ""

# 重新建構最新映像
echo "[1/4] 重新建構映像（確保包含最新程式碼）..."
docker compose build
echo "      映像建構完成"

# 建立暫存目錄
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# 匯出映像
echo "[2/4] 匯出 Docker 映像（約需 1-2 分鐘）..."
docker save yilan-jju-frontend yilan-jju-backend mongo:7 | gzip > "$PACKAGE_DIR/images.tar.gz"
echo "      映像匯出完成"

# 產生部署用 docker-compose.yml（使用 image: 而非 build:）
echo "[3/4] 產生設定檔..."
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
# 每次執行都會更新前後端映像；資料庫映像也會更新，但現有資料不受影響。

set -e

echo "=== 柔術競賽平台啟動腳本 ==="
echo ""

# 確認 Docker 已啟動
if ! docker info > /dev/null 2>&1; then
  echo "錯誤：Docker 未啟動，請先開啟 Docker Desktop"
  exit 1
fi

# 停止現有容器（保留資料 volume）
echo "[1/3] 停止現有容器..."
docker compose down 2>/dev/null || true

# 載入最新映像（覆蓋前後端；MongoDB 映像更新但 volume 資料保留）
echo "[2/3] 載入最新映像（約需 1-2 分鐘）..."
docker load < images.tar.gz
echo "      映像載入完成"

# 啟動所有服務
echo "[3/4] 啟動所有服務..."
docker compose up -d

# 等 mongo healthcheck pass + backend 起來再跑 migration
echo "[4/4] 等待 MongoDB 就緒並執行 schema migration..."
BACKEND_SVC=$(docker compose ps --format json backend 2>/dev/null | head -1 | grep -o '"Name":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$BACKEND_SVC" ]; then
  BACKEND_SVC=$(docker compose ps -q backend | head -1)
fi
# 輪詢 mongo healthcheck（最多 60 秒）
for i in $(seq 1 30); do
  if docker compose exec -T mongo mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "^1$"; then
    echo "      MongoDB 就緒"
    break
  fi
  sleep 2
done

# 跑一次性 Team schema migration（idempotent，已升級的資料會自動 skip）
echo "      執行 Team.members IMember[] migration..."
if docker compose exec -T backend node dist/seeds/migrateMembersToObjects.js 2>&1; then
  echo "      Migration 完成"
else
  echo "      ⚠️  Migration 失敗（如果是全新部署可忽略；舊資料部署請手動執行）"
fi

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
echo "   場次裁判：match1 / match1"
echo "   檢錄員：checkin / checkin123"
echo "   觀眾：audience / audience123"
echo ""
echo "停止服務：docker compose down"
echo "查看日誌：docker compose logs -f"
EOF

chmod +x "$PACKAGE_DIR/start.sh"
echo "      設定檔產生完成"

# 壓縮整個目錄
echo "[4/4] 壓縮打包..."
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
echo "  tar -xzf $OUTPUT_FILE"
echo "  cd jju-package"
echo "  ./start.sh"
