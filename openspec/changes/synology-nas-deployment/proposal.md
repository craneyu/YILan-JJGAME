## Why

現有部署包（`package-docker.sh`）以 MacBook 為目標，產出單一合併映像 tar.gz，無法直接透過 Synology Container Manager GUI 匯入。需要新增 Synology NAS 專屬部署支援，讓系統可穩定運行於 Realtek RTD1619B（arm64）、2GB 記憶體的 Synology NAS 上，並提供純 GUI 操作手冊，無需 SSH。

## What Changes

- 新增 `synology/docker-compose.yml`：NAS 專用 compose 設定，包含 MongoDB 記憶體限制（512MB + WiredTiger cache 0.25GB），使用 named volumes
- 新增 `synology/MANUAL.md`：繁體中文 Synology Container Manager 操作手冊，涵蓋映像匯入、專案建立、啟動、備份、更新全流程
- 新增 `package-synology.sh`：Mac 端打包腳本，將三個映像分別匯出為獨立 `.tar` 檔（frontend.tar、backend.tar、mongo.tar），配合 Container Manager GUI 逐一匯入需求

## Capabilities

### New Capabilities

- `synology-deployment`: Synology NAS Container Manager 部署設定與操作手冊

### Modified Capabilities

(none)

## Impact

- Affected specs: `synology-deployment`（新）
- Affected code:
  - `synology/docker-compose.yml`（新建）
  - `synology/MANUAL.md`（新建）
  - `package-synology.sh`（新建）
