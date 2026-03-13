## 1. NAS 專用 docker-compose.yml

- [x] 1.1 建立 `synology/` 目錄，新增 `synology/docker-compose.yml`：以 `image:` 參照（非 `build:`），依「MongoDB 記憶體限制策略」決策對 MongoDB 加入 `--wiredTigerCacheSizeGB 0.25` command 與 `mem_limit: 512m`，並依「Container Manager 專案路徑」決策使用 named volumes，實現「MongoDB memory usage is bounded on 2GB NAS」需求

## 2. Mac 端 Synology 打包腳本

- [x] 2.1 新增 `package-synology.sh`：依「映像分離打包」決策對 `yilan-jju-frontend`、`yilan-jju-backend`、`mongo:7` 分別執行 `docker save -o`，輸出三個獨立 `.tar` 檔，複製 `synology/docker-compose.yml`，並壓縮為 `synology-YYYYMMDD-HHMM.zip`，實現「Synology NAS deployment package can be built from Mac」需求

## 3. Synology Container Manager 操作手冊

- [x] 3.1 新增 `synology/MANUAL.md`：繁體中文操作手冊，涵蓋以下章節，實現「Operations manual covers full lifecycle in Traditional Chinese」與「System can be deployed via Synology Container Manager GUI without SSH」需求
  - 前置準備（確認 Container Manager 版本、開啟 File Station）
  - 第一次部署（上傳 zip、解壓、逐一匯入三個映像、建立專案）
  - 日常操作（啟動/停止專案、查看日誌）
  - 資料備份（從 Container Manager 匯出 volume 或複製資料）
  - 更新版本（停止專案、刪除舊映像、匯入新映像、重啟專案）

## 4. 驗收

- [x] 4.1 確認 `synology/docker-compose.yml` 語法正確（執行 `docker compose -f synology/docker-compose.yml config`）
- [x] 4.2 確認 `package-synology.sh` 有執行權限且語法無誤（`bash -n package-synology.sh`）
