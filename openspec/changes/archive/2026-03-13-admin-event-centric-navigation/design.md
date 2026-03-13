## Context

目前管理員前端路由結構為扁平式：登入後先看到運動項目選擇器（`/admin`），各項目管理頁各自包含賽會選擇邏輯。後端資料模型已正確以 `Event` 為頂層容器（`Match`、`Team` 均有必填 `eventId`），但前端導航結構未能反映此層次關係。

現有路由：
```
/admin                   → AdminSportSelectorComponent（四項運動卡片）
/admin/kata              → AdminComponent（演武管理，含建立賽會）
/admin/matches/:type     → MatchManagementComponent（含賽會選擇 dropdown）
```

## Goals / Non-Goals

**Goals:**
- 以賽會為頂層容器，管理員先選賽會再進入各運動項目
- 新增獨立賽會列表頁，集中管理建立/刪除賽會
- 進入特定賽會後，透過 URL param 傳遞 `eventId`，各管理頁無需再選賽會
- 後端 API 不變

**Non-Goals:**
- 修改計分流程、VR 評分、賽序控制等非管理頁邏輯
- 修改後端任何端點或資料模型
- 賽會間跨運動項目的統計整合

## Decisions

### 新增 EventListComponent 作為管理員入口

管理員登入後導向 `/admin/events`，由新建的 `EventListComponent` 顯示所有賽會列表。此頁面負責：
- 列出所有賽會（名稱、日期、場地、狀態）
- 建立新賽會（含競賽類型選擇：Duo/Show）
- 刪除賽會（含 SweetAlert2 確認）

**捨棄方案**：將建立賽會放在現有 sport selector 頁面——會讓進入點過於複雜。

### 將 AdminSportSelectorComponent 改造為賽會儀表板

原運動項目選擇頁改為 `EventDashboardComponent`（或直接改造現有元件），路由為 `/admin/events/:eventId`。顯示當前賽會名稱後，呈現四個運動項目卡片供選擇。`eventId` 從 route param 取得，透過 Router 導向子頁面時一併帶入。

**捨棄方案**：使用 Angular `ActivatedRoute` 父子路由共享 param——此方案路由結構更複雜；改為每個子路由各自讀取 `:eventId` param 更直觀。

### 各運動管理路由嵌套在 `/admin/events/:eventId/` 下

新路由結構：
```
/admin                              → 導向 /admin/events
/admin/events                       → EventListComponent
/admin/events/:eventId              → EventDashboardComponent
/admin/events/:eventId/kata         → AdminComponent（演武管理）
/admin/events/:eventId/matches/:type → MatchManagementComponent
```

各管理元件透過 `ActivatedRoute.snapshot.params['eventId']` 取得賽會 ID，不再維護內部賽會選擇狀態。

### AdminComponent 移除建立賽會功能

演武管理頁（`AdminComponent`）的「建立賽會」表單與相關 signal（`showCreateEvent`、`newEvent`、`newEventCompetitionTypes`）一律移除。EventListComponent 承接此職責。

### MatchManagementComponent 移除賽會選擇 dropdown

對打/寢技/格鬥管理頁移除現有的賽會選擇 UI，直接從 `ActivatedRoute` 讀取 `eventId`，初始化時即載入該賽會的場次資料。

## Risks / Trade-offs

- [相容性] 現有書籤或直連 `/admin/kata`、`/admin/matches/:type` 的連結會失效 → 接受，LAN 環境使用者習慣透過 UI 導航
- [重構量] `AdminComponent` 目前 1,913 行，移除建立賽會邏輯需謹慎避免誤刪相關 signal → 逐步移除，先確認無其他地方依賴 `showCreateEvent`
- [狀態初始化] `MatchManagementComponent` 原本在 dropdown 選擇賽會後才載入資料，改為進頁即載入 → 需確保 `eventId` param 存在時才發 API 請求
