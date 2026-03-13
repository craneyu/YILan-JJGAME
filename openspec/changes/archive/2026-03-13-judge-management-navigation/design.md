## Context

目前裁判管理頁（`/admin/judges`）的入口是 `admin-sport-selector` 頁面右上角的「裁判管理」按鈕。此頁面是進入特定賽會後才出現的頁面。但裁判帳號管理是全局操作（新增帳號、指派角色、改密碼、刪除），與特定賽會無關，導致管理員必須先「進入某個賽會」才能執行帳號管理，操作層次多餘。

## Goals / Non-Goals

**Goals:**
- 在賽會列表頁（`event-list`）的頁首按鈕區新增「裁判管理」按鈕
- 從賽會內頁（`admin-sport-selector`）移除「裁判管理」按鈕

**Non-Goals:**
- 不修改 `/admin/judges` 路由或 `judge-management` 元件本身
- 不調整裁判管理頁面的「返回」按鈕（已指向 `/admin/events`，語義正確）
- 不影響後端 API

## Decisions

### 在 event-list 新增裁判管理按鈕

在 `event-list.component.html` 的頁首操作區（與「建立賽會」和「登出」相鄰），新增一個 `glass-btn` 風格的「裁判管理」按鈕，使用 `faUserTie` icon，點擊後呼叫 `navigateToJudges()` 導向 `/admin/judges`。

`event-list.component.ts` 需新增：
- import `faUserTie` 圖示
- `navigateToJudges()` 方法（呼叫 `this.router.navigate(['/admin/judges'])`）

### 從 admin-sport-selector 移除裁判管理按鈕

在 `admin-sport-selector.component.html` 移除「裁判管理」按鈕的 HTML 片段。
在 `admin-sport-selector.component.ts` 移除 `faUserTie` icon（若僅此處使用）以保持 import 整潔。

## Risks / Trade-offs

- [風險] 管理員若記憶路徑習慣從賽會內頁進入裁判管理 → 緩解：裁判管理仍在相同 URL，只是入口移動，影響極小
- [取捨] 賽會列表頁頁首按鈕會增加一個，視覺稍微複雜 → 可接受，管理員頁面原本就有多個操作按鈕
