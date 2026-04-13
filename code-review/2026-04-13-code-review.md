# Code Review Report - 柔術競賽線上即時計分平台

**日期**: 2026-04-13
**審查範圍**: 全專案（Backend / Frontend / Deployment / Configuration）
**專案版本**: Latest commit `d973798`
**部署環境**: 封閉 WiFi 區域網路（不對外開放）

---

## 環境前提

本系統部署於**封閉 WiFi 網路**，僅供比賽現場裁判、管理員與觀眾端使用，無對外網路存取。因此：

- 外部攻擊風險（CORS、CSRF、暴力破解、XSS）可忽略或降至最低
- **首要關注**：比賽進行中的**穩定性**、**資料正確性**、**斷線恢復能力**
- **次要關注**：操作體驗、錯誤提示、效能

---

## 目錄

1. [總覽與統計](#總覽與統計)
2. [Critical - 影響比賽結果正確性](#critical---影響比賽結果正確性)
3. [High - 影響比賽穩定度](#high---影響比賽穩定度)
4. [Medium - 改善可靠性與體驗](#medium---改善可靠性與體驗)
5. [Low - 程式碼品質改善](#low---程式碼品質改善)
6. [不適用 / 降級項目](#不適用--降級項目)
7. [依賴套件掃描](#依賴套件掃描)
8. [建議修復排程](#建議修復排程)

---

## 總覽與統計

| 嚴重度 | 數量 | 主要類型 |
|--------|------|----------|
| **Critical** | 3 | 計分 Race Condition、計算驗證 |
| **High** | 8 | 斷線恢復、錯誤處理、輸入驗證 |
| **Medium** | 10 | Null check、效能、狀態管理 |
| **Low** | 9 | 程式碼品質、一致性 |
| **降級/不適用** | 12 | 安全類議題（封閉網路不適用） |
| **合計** | **42** | |

---

## Critical - 影響比賽結果正確性

### C-01: Kata 計分提交 Race Condition（重複計算）

**檔案**: `backend/src/controllers/scoreController.ts:29-67`

Score model 缺少唯一複合索引，同一裁判快速連點「確認送出」可重複寫入：

```typescript
const score = await Score.create({ ... });  // 無 unique index 防重
const allScores = await Score.find({ eventId, teamId, round, actionNo });
if (allScores.length === 5) { ... }  // 第 6 筆寫入後 length=6，不觸發；但 5 筆同時寫入可能重複觸發
```

**影響**: 比賽現場裁判按兩次送出 → 同一動作計算結果廣播兩次，觀眾端閃爍或顯示錯誤分數。

**建議修正**: 加上 `(eventId, teamId, round, actionNo, judgeId)` 唯一複合索引，捕捉 `E11000` 錯誤回傳 409。`creativeScoreController.ts` 已有此做法，照搬即可。

---

### C-02: Creative Score 同樣的 Race Condition

**檔案**: `backend/src/controllers/creativeScoreController.ts:60-88`

雖然 Creative Score 已有唯一索引防止重複寫入（比 Kata Score 好），但 `allScores.length === 5` 的計算觸發仍無原子性：

```typescript
const allScores = await CreativeScore.find({ eventId, teamId });
if (allScores.length === 5) {
  // 若兩位裁判同時提交第 5 分，兩個 request 都可能進入此 block
  const calculated = calculateCreativeScore(...);
  broadcast.creativeScoreCalculated(...);
}
```

**影響**: 計算結果可能廣播兩次。

**建議修正**: 使用 `findOneAndUpdate` + `returnDocument: 'after'` 做原子更新，或在計算前用 `GameState` 加鎖。

---

### C-03: 計分工具函式未驗證裁判人數

**檔案**: `backend/src/utils/creativeScoring.ts:46-47`

```typescript
export function calculateCreativeScore(judgeScores: CreativeJudgeScore[], ...) {
  // 未檢查 judgeScores.length === 5
  const technicalScores = judgeScores.map((s) => s.technicalScore);
  // 若只有 3 位裁判的分數進來，去最高最低後只剩 1 個，結果完全錯誤
}
```

同樣問題在 `backend/src/utils/scoring.ts` 的 `calculateActionScores()` 中也存在。

**影響**: 若因任何原因未滿 5 位裁判就觸發計算，分數結果將不正確。

**建議修正**: 函式開頭加 `if (judgeScores.length !== 5) throw new Error('Expected 5 judges')`。

---

## High - 影響比賽穩定度

### H-01: Frontend Socket.IO 無斷線重連機制

**檔案**: `frontend/src/app/core/services/socket.service.ts:224-232`

```typescript
constructor() {
  this.socket = io(environment.socketUrl || window.location.origin, {
    transports: ["websocket"],
  });
  // 無 reconnection 設定
  // 無 ngOnDestroy / socket.disconnect()
}
```

**影響**: 封閉 WiFi 環境訊號不穩是常見情況。WiFi 瞬斷後 socket 不會自動重連，裁判端/觀眾端畫面凍結，需手動重新整理。**這是比賽中最可能發生的實際問題。**

**建議修正**:
```typescript
this.socket = io(url, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,  // 持續嘗試重連
});
```

---

### H-02: 所有 Controller 缺少 try-catch

**檔案**: 全部 19 個 controller

Express 5 雖會自動處理 async 錯誤交給全域 errorHandler，但所有錯誤統一回傳 500，前端無法區分：
- 400 - 使用者輸入錯誤（可修正重試）
- 404 - 資源不存在（賽事已刪除）
- 409 - 重複提交（裁判按兩次）
- 500 - 系統真的壞了

**影響**: 比賽中出現錯誤時，管理員/裁判只看到「伺服器內部錯誤」，無法判斷原因。

**建議修正**: 各 controller 加 try-catch，回傳具體 HTTP 狀態碼與中文錯誤訊息。

---

### H-03: 多個 Component Socket 訂閱缺少 error handler

**檔案**: `scoring-judge.component.ts:162`, `vr-judge.component.ts`, `fighting-referee.component.ts`, `contact-referee.component.ts` 等

```typescript
this.socket.actionOpened$.subscribe((e) => {
  // 無 error callback — socket 斷線後靜默失敗
});
```

**影響**: 裁判 WiFi 斷線重連後，可能看到舊狀態但不知道資料已過期，導致評錯分。

**建議修正**: 加上 error handler，至少顯示「連線中斷，請稍候」的 UI 提示。

---

### H-04: Kata 計分項目（items）未驗證分數範圍

**檔案**: `backend/src/controllers/scoreController.ts:29-37`

```typescript
const score = await Score.create({
  items,  // 直接存入，未在 controller 層驗證 p1-p5 是否在 0-3 範圍
});
```

Mongoose schema 有 min/max 驗證，但若觸發則回傳模糊的 500 錯誤。

**影響**: 比賽中裁判前端若出 bug 送出非法值，後端不會給清楚的錯誤訊息。

**建議修正**: Controller 層提前驗證：`if (items.p1 < 0 || items.p1 > 3) return res.status(400)...`

---

### H-05: VR Score round 值未驗證範圍

**檔案**: `backend/src/controllers/vrScoreController.ts:20-22`

`round` 參數未驗證是否在 1-3 範圍，`getSeriesLetter(round)` 對非法值回傳 'A'。

**影響**: 若前端傳入 round=4，VR 分數會存入但歸類到錯誤的系列。

**建議修正**: `if (![1, 2, 3].includes(round)) return res.status(400)...`

---

### H-06: Frontend API Service 缺少全域錯誤處理與 timeout

**檔案**: `frontend/src/app/core/services/api.service.ts:16-51`

所有 HTTP 方法回傳原始 Observable，無 timeout、無統一 catchError。

**影響**: WiFi 不穩時 HTTP 請求可能 hang 住不回應，裁判按送出後畫面無反應。

**建議修正**: 加入 timeout（15-30s）及 catchError pipe。

---

### H-07: Admin Component 使用 Non-null Assertion 無防護

**檔案**: `frontend/src/app/features/admin/admin.component.ts:605, 653`

```typescript
this.api.post(..., `/events/${this.selectedEvent()!._id}/teams/batch-delete`, ...)
```

**影響**: 管理員快速操作時 `selectedEvent()` 可能為 null，導致管理介面 crash。

**建議修正**: `const event = this.selectedEvent(); if (!event) return;`

---

### H-08: Nginx Socket.IO proxy 缺少 timeout 設定

**檔案**: `frontend/nginx.conf:19-25`

缺少 `proxy_read_timeout`、`proxy_send_timeout`。

**影響**: WebSocket 長連線可能因 Nginx 預設 60s timeout 被中斷，比賽途中觀眾端突然斷線。

**建議修正**:
```nginx
location /socket.io/ {
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
    # ... 其他設定
}
```

---

## Medium - 改善可靠性與體驗

### M-01: 多處 Controller 未檢查資源是否存在

**檔案**: `flowController.ts:62`, `creativeFlowController.ts` 等

```typescript
const event = await Event.findById(eventId).lean();
// 未檢查 null → 後續操作 crash → 500 錯誤
```

**建議修正**: 加 null check 回傳 404 + 清楚訊息。

---

### M-02: 註冊功能未驗證角色值

**檔案**: `backend/src/controllers/authController.ts:51`

`role` 欄位只檢查存在，不驗證是否為合法角色。

**影響**: 管理員手動建帳時若拼錯角色名，帳號無法正常使用但不會報錯。

**建議修正**: 驗證 `role` 在 `['scoring_judge', 'vr_judge', 'sequence_judge', 'match_referee', 'admin', 'audience']` 中。

---

### M-03: Match Score delta 值未驗證

**檔案**: `backend/src/controllers/matchScoreController.ts:31-34`

加減分的 `delta` 值未驗證合法範圍。

---

### M-04: 狀態機轉換未完全驗證

**檔案**: `matchController.ts`

定義了 `VALID_TRANSITIONS` 但部分狀態變更繞過驗證（如 `creativeFlowController` 直接設 `'idle'`）。

**影響**: 極端操作下可能進入不合法狀態。

---

### M-05: 8 個前端元件缺少 OnPush 變更偵測策略

**檔案**: `scoring-judge.component.ts`, `admin.component.ts`, `audience.component.ts` 等

使用 Signal 的元件應搭配 `OnPush` 以提升效能。

**影響**: 比賽現場使用低階平板/筆電時可能有效能差異。

---

### M-06: Socket 事件監聽器未快取（shareReplay）

**檔案**: `frontend/src/app/core/services/socket.service.ts:242-525`

每次呼叫 getter 建立新的 `fromEvent` 訂閱。

**影響**: 多次呼叫同一 getter 可能建立重複訂閱，造成事件重複處理。

---

### M-07: Match import 可能使用過時 signal 資料

**檔案**: `frontend/src/app/features/admin/match-management/match-management.component.ts:428-439`

API 呼叫失敗時 fallback 到 signal 中的舊資料。

---

### M-08: Auth Interceptor 只處理 401

**檔案**: `frontend/src/app/core/interceptors/auth.interceptor.ts:11-19`

其他 HTTP 錯誤（403、500）靜默通過，元件可能未處理。

---

### M-09: 浮點數精度風險

**檔案**: `frontend/src/app/features/creative-scoring-judge/creative-scoring-judge.component.ts:50-62`

`intPart + decPart` 可能有 JavaScript 浮點數精度問題（如 `9 + 0.5` 正常，但 `0.1 + 0.2 ≠ 0.3`）。

---

### M-10: 缺少 .dockerignore

**檔案**: `frontend/`, `backend/`

`COPY . .` 可能將 `node_modules`、`.git` 等複製進映像，增加 build 時間與映像大小。

---

## Low - 程式碼品質改善

### L-01: 錯誤訊息中英文混用

多處 controller 錯誤訊息混用中英文（如 `'side 須為 red 或 blue'`）。

---

### L-02: 部分 Model 缺少 updatedAt

**檔案**: `backend/src/models/Match.ts:194`

Match model 只記錄 `createdAt`。

---

### L-03: 硬編碼 Magic Numbers

**檔案**: `fighting-referee.component.ts:83-86`

```typescript
timerRemaining = signal(120);   // 比賽時長？
redOsaeKomiRemaining = signal(15);  // 壓制秒數？
```

---

### L-04: 空的 Error Handler

**檔案**: `creative-scoring-judge.component.ts:219`

```typescript
error: () => {},  // 靜默失敗
```

---

### L-05: Frontend postFile() 標頭處理不一致

**檔案**: `frontend/src/app/core/services/api.service.ts:40-44`

手動組裝 header 而非使用 `getHeaders()`。

---

### L-06: populate 未限制回傳欄位

**檔案**: `scoreController.ts:74-75`

`.populate()` 載入整個關聯文件。

---

### L-07: Environment socketUrl 永遠為空字串

**檔案**: `frontend/src/environments/environment.ts:4`

開發時可能連到錯誤 port。

---

### L-08: Dead Code / Unused Variables

**檔案**: `teamController.ts:65` - `competitionType` 在 Duo 路徑下未使用。

---

### L-09: 平台固定為 linux/arm64

**檔案**: `docker-compose.yml:4,13,26`

寫死 Apple Silicon 平台，建議加註解說明原因。

---

## 不適用 / 降級項目

以下為原始審查中列出、但因**封閉 WiFi 環境**而降級或不適用的項目：

| 原編號 | 原嚴重度 | 項目 | 降級原因 |
|--------|----------|------|----------|
| C-01 | Critical → **Low** | JWT Secret 弱預設值 | 封閉網路，僅現場人員可存取。建議仍替換但非緊急。 |
| C-02 | Critical → **不適用** | CORS 完全開放 | 封閉網路無外部網站可發動跨域攻擊，`*` 反而方便多裝置連線。 |
| C-03 | Critical → **Low** | Seed 帳密寫死 | 現場使用的便利帳號，僅賽事人員知道。正式環境由管理員改密碼即可。 |
| C-04 | Critical → **Low** | 部分端點無認證 | Rankings 和 scores 本就是觀眾端顯示的公開資訊，無認證較合理。 |
| C-05 | Critical → **Low** | 請求 Body 無大小限制 | 封閉網路無外部攻擊者，LAN 內不會有 DoS。 |
| C-08 | Critical → **Low** | Socket 事件未驗證發送者 | 封閉 WiFi，連線者皆為賽事人員/裝置。 |
| H-04 | High → **不適用** | Nginx 安全標頭 | 封閉網路，無 Clickjacking/XSS 攻擊場景。 |
| H-05 | High → **不適用** | Rate Limiting | 已知使用者，不會有暴力破解。 |
| H-10 | High → **不適用** | Docker root 執行 | 封閉環境，容器逃逸風險可忽略。 |
| H-16 | High → **不適用** | Helmet 安全中介層 | 同上，安全標頭在 LAN 無實質效益。 |
| M-05 | Medium → **不適用** | MongoDB 未啟用認證 | Port 未曝露，封閉網路內部存取。 |
| M-14 | Medium → **不適用** | CSRF 防護 | 封閉網路，無跨站請求偽造場景。 |

---

## 依賴套件掃描

### 封閉環境下的風險評估

大部分 `npm audit` 漏洞屬於**遠端攻擊型**（ReDoS、Path Traversal、XSS），在封閉 WiFi 環境下風險極低。唯一值得注意的是：

| 套件 | 嚴重度 | 說明 | 封閉環境風險 |
|------|--------|------|-------------|
| xlsx | HIGH | Prototype Pollution | **中等** - 管理員上傳惡意 Excel 可觸發，但攻擊者須為現場人員 |
| socket.io-parser | HIGH | 無限制二進位附件 | **低** - 需要惡意客戶端發送大量資料 |
| 其他（path-to-regexp, vite, ajv 等） | HIGH | 各種 ReDoS/Traversal | **極低** - 需外部攻擊觸發 |

**建議**: 定期 `npm audit fix` 更新可修復的套件即可。`xlsx` 若有需要可替換為 `exceljs`，但非急迫。

---

## 建議修復排程

### Phase 1: 賽前必修（1 天）— 影響比賽正確性

| 項目 | 工作量 | 對應 Issue |
|------|--------|-----------|
| Score model 加唯一複合索引 + 處理 E11000 | 1h | C-01 |
| 計分工具函式加裁判人數檢查 | 0.5h | C-03 |
| SocketService 加入 reconnection 設定 | 0.5h | H-01 |
| Nginx socket proxy 加 timeout | 0.5h | H-08 |

### Phase 2: 提升穩定度（2-3 天）— 改善比賽體驗

| 項目 | 工作量 | 對應 Issue |
|------|--------|-----------|
| 關鍵 controller 加 try-catch（score, flow, creative） | 2h | H-02 |
| 計分 items 範圍驗證 + VR round 驗證 | 1h | H-04, H-05 |
| Frontend ApiService 加 timeout（15s） | 0.5h | H-06 |
| Socket 訂閱加 error handler（裁判端元件） | 1h | H-03 |
| Admin non-null assertion 修正 | 0.5h | H-07 |

### Phase 3: 改善品質（持續進行）

| 項目 | 工作量 | 對應 Issue |
|------|--------|-----------|
| 其餘 controller 加 try-catch | 2h | H-02 |
| Controller null check（資源不存在回 404） | 1h | M-01 |
| 註冊 API 驗證 role 值 | 0.5h | M-02 |
| 8 個元件補 OnPush | 1h | M-05 |
| Socket 事件 shareReplay 快取 | 1h | M-06 |
| 建立 .dockerignore | 0.5h | M-10 |
| 整理 Magic Numbers、錯誤訊息 | 1h | L-01~L-04 |

---

## 整體評價

### 優點

- **架構清晰**: 前後端分離、角色分明、路由結構合理
- **技術選型現代**: Angular 20 Signals、Express 5、Standalone Components
- **即時同步完整**: Socket.IO 事件覆蓋所有 5 種競技項目
- **多項目支援**: Duo/Creative/Fighting/Ne-Waza/Contact 設計完善
- **部署方案多元**: Docker Compose + 便攜包 + Synology NAS，離線可用
- **UI 設計一致**: Glassmorphism 風格統一、Tailwind 4.x 自訂主題
- **Creative Score 已有防重**: `creativeScoreController` 使用唯一索引 + E11000 處理，是好的範例

### 主要風險（封閉環境觀點）

1. **計分正確性**（Critical）: Kata Score 的 Race Condition 是最大風險 — 裁判連點可能導致分數計算錯誤
2. **WiFi 斷線恢復**（High）: Socket.IO 無 reconnection 設定，WiFi 不穩時畫面凍結
3. **錯誤可診斷性**（High）: 所有 controller 錯誤統一回傳 500，比賽中出問題難以快速定位
4. **Nginx timeout**（High）: WebSocket 可能因預設 60s timeout 中斷長連線

### 安全性總結

在封閉 WiFi 環境下，本系統的安全性**已足夠**。JWT 認證 + 角色權限控制涵蓋了 LAN 內的基本需求。原始審查中 12 項安全類議題在此環境下皆已降級或不適用。

---

*報告產生者: Claude Code Review*
*審查工具: 靜態程式碼分析 + 手動 Code Review*
*環境考量: 封閉 WiFi 區域網路（不對外）*
