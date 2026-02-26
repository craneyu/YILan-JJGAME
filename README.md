# 柔術競賽演武計分平台

> 宜蘭縣柔術傳統演武線上即時計分系統

[![Node.js](https://img.shields.io/badge/Node.js-22-green)](https://nodejs.org/)
[![Angular](https://img.shields.io/badge/Angular-20-red)](https://angular.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-brightgreen)](https://www.mongodb.com/)

---

## 系統簡介

本系統為柔術競賽**傳統演武**項目設計，提供裁判即時計分、賽程流程控制，以及觀眾即時觀看比賽成績的完整解決方案。系統透過 WebSocket 實現多端即時同步，所有裁判與觀眾畫面無需手動重新整理。

### 核心功能

| 功能       | 說明                                          |
| ---------- | --------------------------------------------- |
| 多角色登入 | 計分裁判 × 5、VR 裁判、賽序裁判、管理員、觀眾 |
| 即時計分   | Socket.IO 廣播，所有畫面毫秒級同步更新        |
| 自動計算   | 去掉最高/最低分，取中間三位裁判加總           |
| 賽程控制   | 賽序裁判控制開放評分、換組、輪次推進          |
| 棄權處理   | 支援設定/取消棄權，跳過 VR 評分直接換組       |
| 分組管理   | 男子組 / 女子組 / 混合組，支援批次場次排序    |
| 資料匯入   | 支援 Excel (.xlsx) / CSV 格式批次匯入隊伍     |
| 觀眾介面   | 大螢幕顯示即時成績與組別排名                  |
| 管理後台   | 賽事管理、隊伍管理、裁判帳號管理與密碼變更    |

---

## 賽制說明

- **評分系列**：A 系列（A1–A4）、B 系列（B1–B4）、C 系列（C1–C4）
- **輪次結構**：共 3 輪，R1=A 系列、R2=B 系列、R3=C 系列
- **組別差異**：男子組每系列 4 個動作；女子組/混合組每系列 3 個動作
- **計分算法**：每項目收集 5 位裁判評分（0–3 分），去掉最高分與最低分，取中間三位加總（每項最高 9 分）

```
例：5 位裁判評分 [3, 3, 2, 2, 1] → 去 3 去 1 → 3+2+2 = 7 分
```

---

## 技術架構

```
前端 (Angular 20)  ←→  後端 (Node.js + Express 5)  ←→  MongoDB 7
                           ↕
                      Socket.IO 4（即時廣播）
```

| 層級     | 技術                                     |
| -------- | ---------------------------------------- |
| 前端框架 | Angular 20 Standalone + Signals          |
| UI 樣式  | Tailwind CSS 4.x（玻璃態 Glassmorphism） |
| 即時通訊 | Socket.IO 4                              |
| 後端框架 | Node.js 22 + Express 5 + TypeScript      |
| 資料庫   | MongoDB 7 + Mongoose 8 ODM               |
| 認證     | JWT（無過期，LAN 環境）                  |
| 部署     | Docker Compose                           |

---

## 快速開始

### 環境需求

- Docker + Docker Compose（推薦方式）
- 或 Node.js 22+、MongoDB 7

### Docker 啟動（推薦）

```bash
# 複製專案
git clone https://github.com/craneyu/YILan-JJGAME.git
cd YILan-JJGAME

# 啟動所有服務（前端、後端、MongoDB）
docker compose up --build

# 開啟瀏覽器
# 前端：http://localhost:4200
# 後端 API：http://localhost:3000
```

### 手動啟動（開發模式）

```bash
# 1. 啟動 MongoDB
docker run -d --name jju-mongo -p 27017:27017 mongo:7

# 2. 後端
cd backend
cp .env.example .env   # 設定環境變數
npm install
npm run dev            # 監聽 port 3000

# 3. 前端（新終端）
cd frontend
npm install
npm start              # 監聽 port 4200
```

### 環境變數設定（`backend/.env`）

```env
MONGO_URI=mongodb://localhost:27017/jju
JWT_SECRET=your_secret_key_here
NODE_ENV=development
PORT=3000
```

---

## 預設帳號

> 僅供開發測試使用，正式環境請透過管理員後台修改密碼。

| 帳號                | 密碼       | 角色           |
| ------------------- | ---------- | -------------- |
| `admin`             | `admin123` | 管理員         |
| `judge1` ~ `judge5` | `judge123` | 計分裁判 #1–#5 |
| `vr`                | `vr123`    | VR 裁判        |
| `seq`               | `seq123`   | 賽序裁判       |

---

## 目錄結構

```
YILan-JJGAME/
├── frontend/                  # Angular 20 前端
│   └── src/app/
│       ├── features/          # 各角色頁面元件
│       │   ├── admin/         # 管理員後台
│       │   ├── audience/      # 觀眾顯示介面
│       │   ├── login/         # 登入頁
│       │   ├── scoring-judge/ # 計分裁判介面
│       │   ├── sequence-judge/# 賽序裁判介面
│       │   └── vr-judge/      # VR 裁判介面
│       └── core/services/     # API、Socket、Auth 服務
├── backend/                   # Node.js + Express 後端
│   └── src/
│       ├── controllers/       # 業務邏輯
│       ├── models/            # Mongoose 資料模型
│       ├── routes/            # API 路由
│       ├── sockets/           # Socket.IO 廣播
│       └── middleware/        # JWT 驗證中介層
├── SPEC/
│   └── SPEC.md                # 完整系統規格書
├── docker-compose.yml
└── README.md
```

---

## API 端點概覽

| 方法       | 路徑                              | 說明                   |
| ---------- | --------------------------------- | ---------------------- |
| `GET/POST` | `/api/v1/events`                  | 賽事管理               |
| `GET`      | `/api/v1/events/:id/summary`      | 賽事摘要（含即時狀態） |
| `GET`      | `/api/v1/events/:id/rankings`     | 各組別成績排名         |
| `GET/POST` | `/api/v1/events/:id/teams`        | 隊伍管理               |
| `POST`     | `/api/v1/events/:id/teams/import` | 批次匯入隊伍           |
| `POST`     | `/api/v1/scores`                  | 送出評分               |
| `GET`      | `/api/v1/scores/my-round`         | 取得本裁判本輪評分     |
| `POST`     | `/api/v1/vr-scores`               | VR 多樣性評分          |
| `POST`     | `/api/v1/flow/open-action`        | 開放評分               |
| `POST`     | `/api/v1/flow/next-group`         | 換組                   |
| `POST`     | `/api/v1/flow/abstain`            | 設定棄權               |
| `POST`     | `/api/v1/auth/login`              | 登入                   |

---

## Socket.IO 即時事件

| 事件                     | 方向            | 說明                       |
| ------------------------ | --------------- | -------------------------- |
| `action:opened`          | Server → Client | 賽序裁判開放某動作評分     |
| `score:submitted`        | Server → Client | 某裁判送出評分             |
| `score:calculated`       | Server → Client | 5 位裁判全數送出，計算完成 |
| `vr:submitted`           | Server → Client | VR 裁判送出多樣性評分      |
| `group:changed`          | Server → Client | 換組                       |
| `round:changed`          | Server → Client | 換輪次                     |
| `team:abstained`         | Server → Client | 設定棄權                   |
| `team:abstain-cancelled` | Server → Client | 取消棄權                   |

---

## 開發指令

```bash
# 前端測試
cd frontend && npm test

# 前端 Lint
cd frontend && npm run lint

# TypeScript 型別檢查（後端）
cd backend && npx tsc --noEmit

# TypeScript 型別檢查（前端）
cd frontend && npx tsc --noEmit

# 前端正式建置
cd frontend && npm run build
```

---

## License

本專案為宜蘭縣柔術運動推廣專用計分系統，版權所有。
