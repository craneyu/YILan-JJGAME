# 單元測試說明

前後端皆已加入 Jest 為單元測試框架。本文說明安裝與執行方式。

## 已實測通過

- **後端**：20 個 case（3 suites）全綠
- **前端**：12 個 case（2 suites）全綠

## 後端（backend）

**框架**：Jest + ts-jest + mongodb-memory-server

### 安裝

```bash
cd backend
npm install
```

新增的 devDependencies：

- `jest` — 測試 runner
- `ts-jest` — TypeScript 轉譯
- `@types/jest` — 型別宣告
- `mongodb-memory-server` — 在記憶體內跑真實 MongoDB 給整合測試用（取代 mock）

### 執行

```bash
cd backend
npm test                # 跑所有測試一次
npm run test:watch      # 監看模式
npm run test:coverage   # 含覆蓋率報告
```

### 測試檔案位置

- `src/<dir>/__tests__/<name>.test.ts` — Jest 規格（被 Jest 收集執行）
- `src/<dir>/__test__/<name>.test.ts` — 舊有的手動 console.log 風格 script（被 Jest 排除，跑 `ts-node` 即可）

注意目錄名 `__tests__`（s）和 `__test__`（無 s）差異：前者是新 Jest 規格、後者是舊 manual script。

### 既有測試

- `src/utils/__tests__/forfeitPropagation.test.ts` — 7 個 case：bye 化、多場處理、source 鏈推進、in-progress 跳過、冪等、(name+teamName) 雙鍵
- `src/utils/__tests__/scoring.test.ts` — 6 個 case：去最高最低+取中間 3 位、wrongAttack、actionTotal
- `src/models/__tests__/Team.test.ts` — 9 個 case：純函式（不需 DB）

## 前端（frontend）

**框架**：Jest + jest-preset-angular（Karma 已被 Angular 官方標記棄用）

### 安裝

```bash
cd frontend
npm install
```

新增的 devDependencies：

- `jest`、`@types/jest`、`jest-environment-jsdom`
- `jest-preset-angular` — 處理 Angular Standalone component + TestBed + Signal

### 執行

```bash
cd frontend
npm test                # 跑所有測試一次
npm run test:watch      # 監看模式
npm run test:coverage   # 含覆蓋率報告
```

舊的 `ng test`（angular.json 內 Karma builder）保留不動，但專案以 `npm test`（Jest）為準。

### 測試檔案位置

- `src/app/**/*.spec.ts` — Jest 規格

### 既有測試

- `src/app/core/utils/match-grouping.spec.ts` — 5 個 case：category 順序、weight class 順序、status-aware 排序（in-progress→pending→completed）
- `src/app/shared/participant-badge.component.spec.ts` — 7 個 case：標準 Angular TestBed 元件測試，驗證 4 種狀態組合與優先序

## 寫測試的慣例

### 後端

- 純函式測試：放 `<dir>/__tests__/`，import 該函式直接斷言（範例：`Team.test.ts`、`scoring.test.ts`）
- 需 DB 的整合測試：用 `mongodb-memory-server` 啟動 in-memory MongoDB；在 `beforeAll` 連線、`afterAll` disconnect、`afterEach` 清資料（範例：`forfeitPropagation.test.ts`）
- **不要** mock Mongoose model；要驗證 query/update 真實行為應跑 in-memory DB

### 前端

- 純函式 / Signal 測試：放 component / util 同目錄，import 直接斷言
- 元件測試：用 Angular `TestBed` 與 host wrapper component；用 `fixture.detectChanges()` 觸發 binding、用 `fixture.nativeElement` 查 DOM（範例：`participant-badge.component.spec.ts`）
- 標準慣例：每個 spec 對單一 component / util 負責，描述用 `describe('<name>', ...)`、case 用 `it('<行為>', ...)`

## CI 整合

`npm test` 是 zero-config 入口，可直接接入 CI（GitHub Actions、Jenkins 等）。Jest 預設 exit code 在失敗時為非 0，可被 pipeline 偵測。
