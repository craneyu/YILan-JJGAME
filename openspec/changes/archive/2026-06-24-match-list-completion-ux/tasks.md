## 1. Bye match 結束返回列表（實作 Requirement: Ne-Waza referee returns to match list view after completing a bye match）

- [x] 1.1 為 Requirement「Ne-Waza referee returns to match list view after completing a bye match」實作返回行為：在 `frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts` 的 `completeByeMatch()` 方法內，於 `Swal.fire({...})` 後面接 `.then(() => { this.view.set("list"); this.activeMatch.set(null); })`，沿用 `endMatch()` 函式既有的相同寫法；驗證：手動跑寢技 bye 場次（藍方空白），按「結束比賽 — 紅方勝」後 SweetAlert 關閉應自動回到場次列表，不需手動點返回

## 2. 列表排序與色差（實作 Requirement: Completed matches are displayed after pending and in-progress matches、Requirement: Completed match rows are visually distinguished from pending rows）

- [x] 2.1 [P] 為 Requirement「Completed matches are displayed after pending and in-progress matches」實作排序鍵：在 `frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.ts` 的列表 computed 內，對每個 weight class 群組的 matches 加入排序鍵 `(status: pending=0, in-progress=0, completed=1, scheduledOrder)`，使 completed 場次沉到群組底；驗證：建立同 weight class 內混合 4 筆（2 pending、2 completed）測試資料，UI 顯示 pending 先、completed 後
- [x] 2.2 [P] 為 Requirement「Completed match rows are visually distinguished from pending rows」實作色差：在 `frontend/src/app/features/ne-waza-referee/ne-waza-referee.component.html` 的列表行上，當 `m.status === 'completed'` 時加上 `bg-emerald-500/10` 與主要文字 `text-white/60` class（疊在現有 `.glass-card` 之上）；驗證：手動進入列表頁，pending 列為 `bg-white/10` 透明白底，completed 列為微綠底
- [x] 2.3 [P] 在 `frontend/src/app/features/fighting-referee/fighting-referee.component.ts` 套用相同排序鍵；驗證：fighting 列表 pending 浮上、completed 沉下
- [x] 2.4 [P] 在 `frontend/src/app/features/fighting-referee/fighting-referee.component.html` 套用相同 completed 列色差；驗證：fighting 列表 completed 行為微綠底
- [x] 2.5 [P] 在 `frontend/src/app/features/contact-referee/contact-referee.component.ts` 與 `.html` 套用排序鍵與色差；驗證：contact 列表同樣 pending 浮上、completed 微綠底
- [x] 2.6 確認 `frontend/src/app/core/utils/match-grouping.ts`（既有 grouping helper）是否需要擴充以支援 status 排序；若 grouping 已只負責分群，排序留在各 component computed；驗證：`grep -n "sort" frontend/src/app/core/utils/match-grouping.ts` 與 component 端排序邏輯不重複

## 3. Admin 寢技賽程管理顯示勝方與即時推播（實作 Requirement: Admin match management displays winner and decision method for completed matches、Requirement: Admin match management subscribes to match completion events for live updates）

- [x] 3.1 為 Requirement「Admin match management displays winner and decision method for completed matches」實作徽章渲染：在 `frontend/src/app/features/admin/match-management/match-management.component.html` 的 `@if (m.status === 'completed')` 區塊內，於既有綠色「完成」標籤旁，依 `m.result?.winner` 渲染 `bg-red-500/20 text-red-300` 的「紅方勝」或 `bg-blue-500/20 text-blue-300` 的「藍方勝」徽章；旁邊用 method-to-label 映射顯示「裁判判決／降伏勝／取消資格」；當 `m.result` 為 undefined/null 時只顯示綠色「完成」徽章，不顯示勝方/方法；驗證：以一筆 result={ winner: 'red', method: 'submission' } 的 match 觀察 UI 顯示「紅方勝 / 降伏勝」
- [x] 3.2 為 Requirement「Admin match management subscribes to match completion events for live updates」實作訂閱：在 `frontend/src/app/features/admin/match-management/match-management.component.ts` 內，於 `ngOnInit` 新增訂閱 `this.socket.matchEnded$`，當事件抵達且 `matchId` 在當前 `matches` signal 內，更新該筆為 `{ ...m, status: 'completed', result: { winner: e.winner, method: e.method } }`；更新後依現有 computed 自動重排；驗證：開兩個瀏覽器頁（admin match-management + ne-waza-referee），裁判端結束場次後 admin 端 1 秒內看到「紅方勝/藍方勝」徽章與排序變化，無需 refresh
- [x] 3.3 確保 method-to-label 映射使用 TypeScript Record 型別並涵蓋全部 MatchMethod 值（judge/submission/dq），未定義 method 時 fallback 顯示空白；驗證：以 method='dq' 與 method=undefined 兩種情境檢視 UI 不報錯

## 4. 驗收

- [x] 4.1 完成一場寢技 bye 後自動回 list，且該場顯示在 completed 區段（綠底）
- [x] 4.2 連續結束 3 場後，列表內 pending 永遠浮在群組頂部，無需手動 refresh
- [x] 4.3 Admin 寢技 match-management 頁與 referee 頁同步：referee 端結束場次後，admin 端徽章與排序同步更新
