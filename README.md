# 柔術競賽線上即時計分平台

> 宜蘭縣柔術競賽多項目線上即時計分系統

[![Node.js](https://img.shields.io/badge/Node.js-22-green)](https://nodejs.org/)
[![Angular](https://img.shields.io/badge/Angular-20-red)](https://angular.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-brightgreen)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://www.docker.com/)

---

## 系統簡介

本系統為宜蘭縣柔術競賽設計，涵蓋三大競技項目的即時計分、賽程控制與觀眾顯示。
透過 WebSocket 實現多端毫秒級同步，所有裁判與觀眾畫面無需手動重新整理。

---

## 支援的競技項目

### 1. 雙人演武（傳統演武 / Duo）

傳統柔術演武競賽，由 5 位計分裁判、1 位 VR 裁判、1 位賽序裁判協作評分。

| 項目         | 說明                                                       |
| ------------ | ---------------------------------------------------------- |
| 評分系列     | A / B / C 三個系列，每系列 3–5 個動作                     |
| 計分方式     | 5 位裁判各評 0–3 分，去最高/最低，取中間三位加總（最高 9 分/動作） |
| VR 多樣性   | 每系列結束後評摔技與地板技多樣性，各 0–2 分               |
| 錯誤攻擊     | VR 裁判可標記動作為無效（該動作歸零）                     |
| 棄權支援     | 賽序裁判可設定/取消棄權，跳過 VR 評分直接換組             |
| 組別         | 男子組 / 女子組 / 混合組，各組獨立排名                    |

**裁判角色**：計分裁判 ×5、VR 裁判 ×1、賽序裁判 ×1

---

### 2. 創意演武（Show）

創意自由演武競賽，另設懲罰扣分與倒數計時機制。

| 項目         | 說明                                              |
| ------------ | ------------------------------------------------- |
| 計時         | 每組表演有固定演出時限，可暫停/繼續               |
| 懲罰扣分     | 裁判可即時記錄懲罰，影響最終分數                 |
| 評分         | 獨立計分流程，與雙人演武分開管理                 |
| 棄權支援     | 支援設定棄權，跳過評分直接換組                   |
| 隊員獨立     | 與雙人演武使用相同場次系統，但成員資料庫獨立     |

**裁判角色**：計分裁判（創意）、賽序裁判（創意）

---

### 3. 對打競技（Fighting）

包含**對打**、**寢技**、**格鬥**三種子項目。

| 子項目     | 說明                                                         |
| ---------- | ------------------------------------------------------------ |
| 對打       | IPPON / WAZA-ARI 得分，SHIDO 警告累積，CHUI 中度犯規，DQ 失格 |
| 寢技       | OSAE-KOMI 壓制計時，WAZA-ARI / IPPON 計分，傷停計時         |
| 格鬥       | 亮牌計分、擊倒、黃金分鐘、犯規管理                           |

**裁判功能**：
- 主裁判（對打/寢技）：即時加/扣分、PART 分計分（+1/+2/+3）、傷停、警告、犯規
- 主裁判（格鬥）：亮牌計分、擊倒記錄、黃金分鐘倒數
- 空白鍵快捷鍵：計時器暫停/繼續
- 觀眾端：WAZA-ARI、SHIDO、CHUI 燈號即時同步、OSAE KOMI 放大倒數顯示（含 15 格進度條與歸零蜂鳴音效）

---

## 技術架構

```
前端 (Angular 20)  ←→  後端 (Node.js + Express 5)  ←→  MongoDB 7
                              ↕
                         Socket.IO 4（即時廣播）
```

| 層級     | 技術                                       |
| -------- | ------------------------------------------ |
| 前端框架 | Angular 20 Standalone Components + Signals |
| UI 樣式  | Tailwind CSS 4.x（玻璃態 Glassmorphism）   |
| 即時通訊 | Socket.IO 4                                |
| 後端框架 | Node.js 22 + Express 5 + TypeScript        |
| 資料庫   | MongoDB 7 + Mongoose 8 ODM                 |
| 認證     | JWT（無過期，LAN 環境適用）                |
| 部署     | Docker Compose                             |

---

## 快速開始

### 環境需求

- Docker + Docker Compose（推薦方式）
- 或 Node.js 22+、MongoDB 7（手動開發）

---

### 方式一：Docker Compose（開發 / 一般部署）

```bash
git clone https://github.com/craneyu/YILan-JJGAME.git
cd YILan-JJGAME

# 啟動所有服務（前端、後端、MongoDB）
docker compose up --build

# 開啟瀏覽器
# 前端：http://localhost:4200
# 後端 API：http://localhost:3000
```

---

### 方式二：Docker 便攜包（MacBook / 離線部署）

```bash
# 解壓便攜包
tar -xzf jju-docker.tar.gz
cd jju-package

# 一鍵啟動（自動載入映像、啟動服務、保留資料庫）
./start.sh

# 開啟瀏覽器：http://localhost:4200
```

> 便攜包已內嵌 frontend、backend、MongoDB 映像，無需網路即可離線運作。

---

### 方式三：手動啟動（開發除錯）

```bash
# 1. 啟動 MongoDB
docker run -d --name jju-mongo -p 27017:27017 mongo:7

# 2. 後端
cd backend
cp .env.example .env    # 設定環境變數
npm install
npm run dev             # 監聽 port 3000

# 3. 前端（新終端）
cd frontend
npm install
npm start               # 監聽 port 4200
```

#### 環境變數（`backend/.env`）

```env
MONGO_URI=mongodb://localhost:27017/jju
JWT_SECRET=your_secret_key_here
NODE_ENV=development
PORT=3000
```

---

## 預設帳號

> 僅供開發測試使用，正式環境請透過管理員後台修改密碼。

| 帳號                | 密碼       | 角色                |
| ------------------- | ---------- | ------------------- |
| `admin`             | `admin123` | 管理員              |
| `judge1` ~ `judge5` | `judge123` | 計分裁判 #1–#5      |
| `vr`                | `vr123`    | VR 裁判             |
| `seq`               | `seq123`   | 賽序裁判            |
| `audience`          | `audience123` | 觀眾（唯讀）     |
| `match1`            | `match1`      | 對打裁判         |

---

## 頁面路由

| 路徑                      | 說明                                   |
| ------------------------- | -------------------------------------- |
| `/login`                  | 登入頁                                 |
| `/judge/scoring`          | 雙人演武：計分裁判                     |
| `/judge/vr`               | 雙人演武：VR 裁判                      |
| `/judge/sequence`         | 雙人演武：賽序裁判                     |
| `/audience`               | 雙人演武：觀眾顯示（大螢幕）           |
| `/creative/scoring`       | 創意演武：計分裁判                     |
| `/creative/sequence`      | 創意演武：賽序裁判                     |
| `/creative/audience`      | 創意演武：觀眾顯示                     |
| `/referee`                | 對打競技：裁判選擇頁                   |
| `/fighting-referee`       | 對打：主裁判                           |
| `/fighting-audience`      | 對打：觀眾顯示                         |
| `/ne-waza-referee`        | 寢技：主裁判                           |
| `/ne-waza-audience`       | 寢技：觀眾顯示                         |
| `/contact-referee`        | 格鬥：主裁判                           |
| `/contact-audience`       | 格鬥：觀眾顯示                         |
| `/audience-select`        | 觀眾端：競技項目選擇頁                 |
| `/admin`                  | 管理員後台                             |
| `/admin/events/:id/kata`  | 管理員：演武賽事管理                   |
| `/admin/events/:id/matches/:type` | 管理員：對打/寢技/格鬥場次管理  |
| `/admin/judges`           | 管理員：裁判帳號管理                   |

---

## 目錄結構

```
YILan-JJGAME/
├── frontend/
│   └── src/app/
│       ├── features/
│       │   ├── admin/                    # 管理員後台
│       │   ├── login/                    # 登入頁
│       │   ├── audience/                 # 雙人演武觀眾
│       │   ├── scoring-judge/            # 雙人演武：計分裁判
│       │   ├── vr-judge/                 # 雙人演武：VR 裁判
│       │   ├── sequence-judge/           # 雙人演武：賽序裁判
│       │   ├── creative-scoring-judge/   # 創意演武：計分裁判
│       │   ├── creative-sequence-judge/  # 創意演武：賽序裁判
│       │   ├── creative-audience/        # 創意演武：觀眾
│       │   ├── fighting-referee/         # 對打：主裁判
│       │   ├── fighting-audience/        # 對打：觀眾
│       │   ├── ne-waza-referee/          # 寢技：主裁判
│       │   ├── ne-waza-audience/         # 寢技：觀眾
│       │   ├── contact-referee/          # 格鬥：主裁判
│       │   ├── contact-audience/         # 格鬥：觀眾
│       │   ├── referee-landing/          # 對打競技：裁判選擇頁
│       │   ├── audience-sport-selector/  # 觀眾：競技項目選擇頁
│       │   ├── match-referee/            # 場次裁判（通用）
│       │   └── match-audience/           # 場次觀眾（通用）
│       └── core/
│           ├── services/                 # API、Socket、Auth 服務
│           ├── models/                   # TypeScript 資料型別
│           └── utils/                    # 場次分組等工具函式
├── backend/
│   └── src/
│       ├── controllers/                  # 業務邏輯
│       ├── models/                       # Mongoose 資料模型
│       ├── routes/                       # API 路由
│       ├── sockets/                      # Socket.IO 廣播處理
│       └── middleware/                   # JWT 驗證中介層
├── SPEC/                                # 系統規格書
├── openspec/                             # Spec-Driven Development 規格
│   ├── specs/                            # 各功能規格文件
│   └── changes/archive/                  # 已完成變更歸檔
├── docker-compose.yml
├── package-docker.sh                     # MacBook 離線打包腳本
├── package-synology.sh                   # Synology NAS 部署打包腳本
└── README.md
```

---

## API 端點概覽

### 演武（雙人 / 創意）

| 方法       | 路徑                                    | 說明                   |
| ---------- | --------------------------------------- | ---------------------- |
| `GET/POST` | `/api/v1/events`                        | 賽事管理               |
| `GET`      | `/api/v1/events/:id/rankings`           | 各組別成績排名         |
| `GET/POST` | `/api/v1/events/:id/teams`              | 隊伍管理               |
| `POST`     | `/api/v1/events/:id/teams/import`       | 批次匯入隊伍（Excel / CSV） |
| `POST`     | `/api/v1/scores`                        | 計分裁判送出評分       |
| `POST`     | `/api/v1/vr-scores`                     | VR 多樣性評分          |
| `POST`     | `/api/v1/wrong-attacks`                 | 標記/取消錯誤攻擊      |
| `POST`     | `/api/v1/flow/open-action`              | 賽序裁判：開放評分     |
| `POST`     | `/api/v1/flow/next-group`               | 賽序裁判：換組         |
| `POST`     | `/api/v1/flow/abstain`                  | 賽序裁判：設定棄權     |
| `POST`     | `/api/v1/creative-scores`               | 創意演武：送出評分     |
| `POST`     | `/api/v1/creative-flow/...`             | 創意演武：流程控制     |

### 對打

| 方法       | 路徑                              | 說明                 |
| ---------- | --------------------------------- | -------------------- |
| `GET/POST` | `/api/v1/matches`                 | 場次管理             |
| `POST`     | `/api/v1/match-scores`            | 記錄得分 / 警告      |
| `GET`      | `/api/v1/matches/:id/score-log`   | 得分紀錄查詢         |

### 通用

| 方法   | 路徑               | 說明   |
| ------ | ------------------ | ------ |
| `POST` | `/api/v1/auth/login` | 登入 |

---

## Socket.IO 即時事件

### 演武項目

| 事件                     | 說明                               |
| ------------------------ | ---------------------------------- |
| `action:opened`          | 賽序裁判開放某動作評分             |
| `score:submitted`        | 某計分裁判送出評分                 |
| `score:calculated`       | 5 位裁判全數送出，結果計算完成     |
| `vr:submitted`           | VR 裁判送出多樣性評分              |
| `wrong-attack:updated`   | VR 裁判標記/取消錯誤攻擊           |
| `group:changed`          | 換組                               |
| `round:changed`          | 換輪次                             |
| `team:abstained`         | 設定棄權                           |
| `team:abstain-cancelled` | 取消棄權                           |

### 對打項目

| 事件                      | 說明                               |
| ------------------------- | ---------------------------------- |
| `match:started`           | 比賽開始                           |
| `match:foul-updated`      | 得分 / 犯規更新（WAZA-ARI、SHIDO、CHUI、PART）|
| `match:timer-updated`     | 計時器更新（剩餘秒數、暫停狀態）   |
| `match:ended`             | 比賽結束（勝方、勝利方式）         |
| `match:full-ippon`        | FULL IPPON 觸發（全螢幕覆蓋提示） |
| `match:winner-preview`    | 裁判預判勝方                       |
| `match:scores-reset`      | 重設比賽分數                       |
| `osae-komi:started`       | OSAE KOMI 壓制開始（含倒數秒數）  |
| `osae-komi:ended`         | OSAE KOMI 壓制結束                |
| `injury:started`          | 傷停計時開始                       |
| `injury:ended`            | 傷停計時結束                       |

---

## 資料匯入格式

### 隊伍匯入（Excel / CSV）

支援 `.xlsx` 與 `.csv` 格式。欄位名稱支援中英文：

| 欄位    | 可接受名稱                                   | 說明           |
| ------- | -------------------------------------------- | -------------- |
| 隊伍名稱 | `隊伍名稱` / `team`                         | 必填           |
| 隊員一  | `隊員一姓名` / `隊員一` / `member1`          | 必填           |
| 隊員二  | `隊員二姓名` / `隊員二` / `member2`          | 選填           |
| 組別    | `組別` / `category`                          | 必填           |

組別可接受值：`male` / `男` / `男子組`、`female` / `女` / `女子組`、`mixed` / `混合` / `混合組`

> **注意**：雙人演武與創意演武為獨立項目，成員資料庫互不影響，同一選手可同時參加兩個項目。

---

## 賽果匯出

管理員後台提供各組別分別匯出：

- **Excel（.xlsx）**：含每動作 P1–P5 詳細分數、VR 多樣性分數、系列小計、總分
- **PDF**：可列印簽名欄，A4 橫向，每組別一頁，附主裁判簽名區

---

## 開發指令

```bash
# 前端測試
cd frontend && npm test

# 前端 Lint
cd frontend && npm run lint

# 型別檢查（後端）
cd backend && npx tsc --noEmit

# 型別檢查（前端）
cd frontend && npx tsc --noEmit

# 前端正式建置
cd frontend && npm run build

# 打包離線部署包
./package-docker.sh              # MacBook 便攜包
./package-synology.sh            # Synology NAS 部署包
```

---

## License

本專案為宜蘭縣柔術競賽專用計分系統，版權所有。
