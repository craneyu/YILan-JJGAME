## 1. 按鈕兩行排列（正向 / 負向）

> 對應規格：Ne-Waza scoring button layout

- [x] 1.1 實作 Ne-Waza scoring button layout：移除計分視圖中紅方與藍方的舊按鈕（`2分` / `3分` / `4分`、`優勢`、`+警告` / `-警告`）
- [x] 1.2 在紅方計分卡內新增正向行：`+2` / `+3` / `+4` / `+A 優勢` / `+P 警告` 按鈕（綠色調 `bg-green-600/70`）
- [x] 1.3 在紅方計分卡內新增負向行：`-2` / `-3` / `-4` / `-A 優勢` / `-P 警告` 按鈕（紅色調 `bg-red-700/60`）
- [x] 1.4 在藍方計分卡內新增正向行：`+2` / `+3` / `+4` / `+A 優勢` / `+P 警告` 按鈕（綠色調）
- [x] 1.5 在藍方計分卡內新增負向行：`-2` / `-3` / `-4` / `-A 優勢` / `-P 警告` 按鈕（紅色調）

## 2. 移除 1 分按鈕

> 對應規格：Ne-Waza scoring button layout（1-point scores do not exist in Ne-Waza rules）

- [x] 2.1 確認 `+1` / `-1` 按鈕不存在於計分視圖，寢技規則無 1 分

## 3. STALLING 映射為 Penalty

> 對應規格：STALLING per-side button

- [x] 3.1 實作 STALLING per-side button：在紅方正向行最右側新增 `STALLING` 按鈕（橘色 `bg-orange-600/70 hover:bg-orange-600`）
- [x] 3.2 在藍方正向行最右側新增 `STALLING` 按鈕（橘色）
- [x] 3.3 在 `match-referee.component.ts` 新增 `addStalling(side: 'red' | 'blue')` 方法，內部呼叫 `addWarning(side)`
- [x] 3.4 確認 `addScore(side, points)` 支援傳入負數（-2, -3, -4）以處理扣分；如不支援則補充 `subtractScore` 方法
- [x] 3.5 確認 `addAdvantage` / `removeAdvantage` 與 `addWarning` / `removeWarning` 方法均存在
