# 柔術競賽平台 — Synology NAS 部署操作手冊

**適用環境**
- NAS 型號：Realtek RTD1619B SoC（arm64）
- 記憶體：2GB
- DSM 版本：7.2 以上
- 套件：Container Manager（需事先於套件中心安裝）

---

## 目錄

1. [前置準備](#1-前置準備)
2. [第一次部署](#2-第一次部署)
3. [確認系統正常運作](#3-確認系統正常運作)
4. [日常操作](#4-日常操作)
5. [資料備份](#5-資料備份)
6. [更新版本](#6-更新版本)
7. [常見問題](#7-常見問題)

---

## 1. 前置準備

### 1.1 在 Mac 端產生部署包

```bash
# 確認 Docker Desktop 已啟動且映像已建置
cd /path/to/Yilan-jju
./package-synology.sh
```

執行完成後會產生 `synology-YYYYMMDD-HHMM.zip`，內含：

```
synology-package/
├── frontend.tar       ← 前端映像（Nginx + Angular）
├── backend.tar        ← 後端映像（Node.js）
├── mongo.tar          ← 資料庫映像（MongoDB 7）
└── docker-compose.yml ← NAS 專用設定（含記憶體限制）
```

### 1.2 上傳至 NAS

1. 開啟瀏覽器，進入 NAS 管理介面（`http://<NAS-IP>:5000`）
2. 開啟 **File Station**
3. 在左側選擇共用資料夾（建議使用 `docker`），建立子資料夾 `jju`
4. 將 `synology-YYYYMMDD-HHMM.zip` 拖曳上傳至 `/docker/jju/`
5. 右鍵點選 zip 檔 → **解壓縮到此處**
6. 解壓後應出現 `synology-package/` 資料夾

---

## 2. 第一次部署

### 2.1 匯入映像

> **重要：Container Manager 需逐一匯入，共三個檔案。**

1. 開啟 **Container Manager**
2. 點選左側 **映像** → 右上角 **新增** → **從檔案匯入**
3. 依序匯入三個檔案：

| 順序 | 選擇檔案 | 匯入後映像名稱 |
|------|----------|----------------|
| 1 | `synology-package/mongo.tar` | `mongo:7` |
| 2 | `synology-package/backend.tar` | `yilan-jju-backend:latest` |
| 3 | `synology-package/frontend.tar` | `yilan-jju-frontend:latest` |

> 每個檔案匯入需等待進度條完成（mongo 約 2–5 分鐘）再匯入下一個。

4. 匯入完成後，**映像**列表應出現三筆記錄。

### 2.2 建立專案

1. 點選左側 **專案** → **新增**
2. 填入設定：
   - **專案名稱**：`jju`
   - **路徑**：點選資料夾圖示，選擇 `/docker/jju/synology-package/`
   - Container Manager 會自動偵測到 `docker-compose.yml`
3. 點選 **下一步**，確認顯示三個服務（frontend、backend、mongo）
4. 點選 **完成**，系統開始啟動容器

### 2.3 等待啟動

- 首次啟動約需 30–60 秒（mongo 健康檢查需時）
- 三個容器均顯示「**執行中**」後，系統即可使用

---

## 3. 確認系統正常運作

開啟瀏覽器，輸入：

```
http://<NAS-IP>:4200
```

應看到登入頁面。

**預設帳號**

| 角色 | 帳號 | 密碼 |
|------|------|------|
| 管理員 | `admin` | `admin123` |
| 計分裁判 1–5 | `judge1`–`judge5` | `judge123` |
| VR 裁判 | `vr` | `vr123` |
| 賽序裁判 | `seq` | `seq123` |

> **請於首次登入後立即至裁判管理頁更改管理員密碼。**

---

## 4. 日常操作

### 啟動系統

1. Container Manager → **專案**
2. 點選 `jju` → **啟動**

### 停止系統

1. Container Manager → **專案**
2. 點選 `jju` → **停止**

### 查看日誌

1. Container Manager → **專案** → `jju`
2. 點選任一容器名稱 → **日誌** 分頁

---

## 5. 資料備份

MongoDB 資料存放於 Docker named volume `jju_mongo_data`。

### 方法：複製 Volume 資料夾

1. **停止**專案（Container Manager → 專案 → jju → 停止）
2. 開啟 **File Station**，進入路徑：
   ```
   /volume1/@docker/volumes/jju_mongo_data/_data/
   ```
3. 選取所有檔案 → **壓縮** → 下載至電腦保存
4. 備份完成後，重新**啟動**專案

> 建議每次賽前與賽後各備份一次。

---

## 6. 更新版本

當 Mac 端有新版程式時，依照以下步驟更新：

### 6.1 Mac 端重新打包

```bash
# 重新建置映像
cd /path/to/Yilan-jju
docker compose up --build -d

# 產生新的 Synology 包
./package-synology.sh
```

### 6.2 上傳新包至 NAS

1. 透過 File Station 上傳新的 `synology-YYYYMMDD-HHMM.zip`
2. 解壓縮

### 6.3 更新映像並重啟

1. **停止**專案：Container Manager → 專案 → jju → **停止**
2. 刪除舊映像：Container Manager → **映像** → 選取三個舊映像 → **刪除**
3. 依序匯入新的三個 `.tar` 檔（同 [2.1 匯入映像](#21-匯入映像)）
4. **啟動**專案

> MongoDB 資料（`jju_mongo_data` volume）不受映像刪除影響，歷史資料完整保留。

---

## 7. 常見問題

### Q: 專案啟動後 mongo 一直顯示「等待中」

**A:** mongo 容器的健康檢查需要約 30 秒。等待即可，不需手動操作。若超過 2 分鐘仍未就緒，點選 mongo 容器查看日誌確認錯誤訊息。

### Q: 瀏覽器無法連線到 port 4200

**A:** 確認 Synology 防火牆允許 port 4200。進入 DSM → 控制台 → 安全性 → 防火牆，新增規則允許 port 4200 和 3000。

### Q: 匯入映像時出現「格式不支援」

**A:** 確認 Container Manager 版本為 1.4 以上（DSM 7.2 預設）。若版本過舊，請至套件中心更新。

### Q: 更新後資料消失

**A:** 資料不會因更新映像而消失，除非手動刪除 volume。若確實消失，請從備份還原（將備份資料複製回 `/volume1/@docker/volumes/jju_mongo_data/_data/`）。

### Q: NAS 記憶體不足，容器被強制停止

**A:** 本設定已限制 MongoDB 最多使用 512MB、後端 400MB。若仍發生記憶體不足，建議關閉 NAS 上其他耗記憶體的套件（如 Plex、Surveillance Station 等）。
