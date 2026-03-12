## Context

兩個裁判元件（`fighting-referee`、`ne-waza-referee`）的場次列表目前以平鋪方式顯示，所有場次混在一起。量級與組別資料已存在於 `Match` model（`category: MatchCategory`、`weightClass: string`、`scheduledOrder: number`），無需後端調整。

## Goals / Non-Goals

**Goals:**
- 在列表視圖中依「組別 → 量級」兩層分組呈現場次
- 量級依規格表固定順序排列（不受字典序影響）
- 同量級內場次依 `scheduledOrder` 升序排列
- 對打、寢技兩元件同步套用

**Non-Goals:**
- 不改動後端 API 或資料模型
- 不加入摺疊/展開（collapsible）互動，保持簡單
- 不影響計分視圖

## Decisions

### 使用 `computed()` Signal 做純前端分組

在元件 TS 中新增 `groupedMatches` computed signal，將平鋪的 `matches` 陣列轉換為兩層分組結構：

```ts
interface WeightGroup {
  weightClass: string;
  matches: Match[];
}
interface CategoryGroup {
  category: MatchCategory;
  label: string;
  weightGroups: WeightGroup[];
}
```

**為何不用 pipe 或 service？** 分組邏輯單純、僅用於列表視圖，放在元件 computed 最直接，符合 OnPush 響應式設計。

### 量級排序使用固定索引表

不用字典序，改用固定規格表定義量級順序：

```ts
const WEIGHT_CLASS_ORDER = [
  '-56 公斤級', '-62 公斤級', '-69 公斤級',
  '-77 公斤級', '-85 公斤級', '-94 公斤級', '+94 公斤級',  // 男子
  '-49 公斤級', '-55 公斤級', '-62 公斤級',
  '-70 公斤級', '+70 公斤級',                              // 女子
];
```

由於男女組已分層（`category` 分組後各自排序），同名量級（如 `-62 公斤級`）在不同組別內各自獨立，`indexOf` 可正確取得組內順序。未知量級（indexOf 回傳 -1）排在最後。

### 組別順序：male → female → mixed

與現有系統的 `categoryOrder` 習慣一致。

## Risks / Trade-offs

- [Risk] `weightClass` 字串若不符合規格表（錯字、大小寫差異）→ indexOf 回傳 -1，排至最後，不影響功能，但視覺上會移位。Mitigation：管理員匯入時應確保字串格式，目前為人工管理。
- [Trade-off] 固定索引表在客製化量級時需手動更新前端，但此系統量級固定，可接受。
