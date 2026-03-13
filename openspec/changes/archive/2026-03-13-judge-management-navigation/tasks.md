## 1. event-list 新增裁判管理入口

- [x] 1.1 在 `event-list.component.ts` 新增 `faUserTie` icon import 及 `navigateToJudges()` 方法（呼叫 `this.router.navigate(['/admin/judges'])`），對應「在 event-list 新增裁判管理按鈕」設計決策
- [x] 1.2 在 `event-list.component.html` 頁首按鈕區新增「裁判管理」按鈕（`glass-btn` 風格，`faUserTie` 圖示），點擊呼叫 `navigateToJudges()`，實現「Admin can navigate to judge management from the event list page」需求

## 2. admin-sport-selector 移除裁判管理入口

- [x] 2.1 從 `admin-sport-selector.component.html` 移除「Admin can access judge management from the sport selection page」功能之按鈕 HTML 片段，實現「從 admin-sport-selector 移除裁判管理按鈕」設計決策
- [x] 2.2 從 `admin-sport-selector.component.ts` 移除 `faUserTie` icon import（若僅此頁使用）

## 3. 驗收

- [x] 3.1 執行 `cd frontend && npm run build`，確認無 build 錯誤
