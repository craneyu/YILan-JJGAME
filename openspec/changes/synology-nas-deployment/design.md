## Context

現有 `package-docker.sh` 以 MacBook M4（arm64）為目標，以 `docker save` 將三個映像合併為單一 `images.tar.gz`，再以 `start.sh` 執行 `docker load` 匯入。此流程需要 SSH 或 Docker CLI，不適用於 Synology Container Manager GUI 操作。

目標 NAS 規格：
- CPU：Realtek RTD1619B SoC（ARMv8，arm64）
- RAM：2GB
- DSM 版本：7.2+（支援 Container Manager 與 docker-compose.yml 專案功能）

現有映像已設定 `platform: linux/arm64`，架構完全相容，無需重新建置。

## Goals / Non-Goals

**Goals:**
- 新增 `synology/docker-compose.yml`，加入 MongoDB 記憶體限制，防止 OOM
- 新增 `package-synology.sh`，將三個映像分別匯出為獨立 `.tar` 檔
- 新增 `synology/MANUAL.md`，提供純 GUI 操作手冊（Container Manager，無需 SSH）

**Non-Goals:**
- 不修改現有 MacBook 部署流程（`package-docker.sh`、`docker-compose.yml`）
- 不修改任何應用程式碼（frontend、backend）
- 不設定 HTTPS / reverse proxy（LAN 內部使用）
- 不支援 Synology 的 DSM 套件格式（.spk）

## Decisions

### MongoDB 記憶體限制策略

2GB NAS 上 MongoDB 7 預設 WiredTiger cache 會嘗試取得 ~1GB（系統 RAM 的 50%），扣除 DSM 系統用量（~400MB）後，剩餘不足以同時跑 Node.js 與 Nginx。

解法：在 `docker-compose.yml` 同時設定兩層限制：
1. `command: ["--wiredTigerCacheSizeGB", "0.25"]`：限制 MongoDB 快取至 256MB
2. `mem_limit: 512m`：Docker 層級上限，防止超出後被 OOM Killer 終止

各服務記憶體分配（目標控制在 1.5GB 以內）：

```
DSM 系統     ~400MB
MongoDB      ~512MB（限制後）
Backend      ~300MB
Frontend     ~50MB
總計         ~1.26GB  ← 留約 750MB buffer
```

### 映像分離打包

Container Manager GUI 的映像匯入（Images → Add → Import）每次只能匯入一個 `.tar` 檔。現有 `docker save A B C | gzip` 輸出多映像合流，GUI 無法直接使用。

解法：`package-synology.sh` 對三個映像分別執行 `docker save <image> -o <name>.tar`，輸出：
- `synology-package/frontend.tar`
- `synology-package/backend.tar`
- `synology-package/mongo.tar`
- `synology-package/docker-compose.yml`（複製自 `synology/docker-compose.yml`）

整個目錄壓縮為 `synology-YYYYMMDD-HHMM.zip`（`.zip` 格式，File Station 可直接解壓）。

### Container Manager 專案路徑

建議使用者將解壓後的 `synology-package/` 上傳至 NAS 的 `/volume1/docker/jju/`，Container Manager 建立專案時指向此路徑即可讀取 `docker-compose.yml`。

Named volumes（`mongo_data`）由 Container Manager 自動建立於 Docker 資料區，不需手動建目錄。

## Risks / Trade-offs

- [風險] MongoDB 512MB 上限在高峰期可能略顯吃緊 → 緩解：WiredTiger cache 已限 256MB，競賽規模（< 50 teams）資料量極小，實際風險低
- [風險] `.tar` 單檔較大（mongo 映像約 400MB）→ 透過 File Station 上傳 Wi-Fi 可能需要數分鐘，屬可接受範圍
- [取捨] 分離為三個 `.tar` 比合包多一些手動匯入步驟 → 是 Container Manager GUI 限制所致，無法避免
