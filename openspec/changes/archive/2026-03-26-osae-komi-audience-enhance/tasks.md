## 1. OSAE KOMI 顯示位置重構

- [x] 1.1 將紅方 OSAE KOMI 區塊從姓名旁的 inline badge 移至選手列的獨立中間 flex 元素，位於姓名區與成績卡（WAZA-ARI/SHIDO）之間（Requirement: OSAE KOMI display positioned between player name and score cards）
- [x] 1.2 將藍方 OSAE KOMI 區塊同樣移至姓名區與成績卡之間的獨立中間 flex 元素
- [x] 1.3 確認 OSAE KOMI 未觸發時中間區塊不佔空間，姓名與成績卡自然貼合

## 2. OSAE KOMI 計時器字體放大

- [x] 2.1 將紅方與藍方 OSAE KOMI 倒數計時器字體從 `text-2xl md:text-3xl` 放大至 `text-6xl md:text-8xl`，標籤從 `text-sm md:text-base` 放大至 `text-xl md:text-2xl`，容器內距相應調整（Requirement: OSAE KOMI countdown timer is displayed at enlarged size）

## 3. 15 格倒數進度條

- [x] 3.1 在 `fighting-audience.component.ts` 中新增 computed signal，根據 `redOsaeKomiRemaining()` 和 `blueOsaeKomiRemaining()` 計算填滿格數：`Math.min(15, remaining)`
- [x] 3.2 在 `fighting-audience.component.html` 的紅方與藍方 OSAE KOMI 區塊下方，新增 15 格水平進度條，填滿格使用 `bg-yellow-400`、空格使用 `bg-white/10`，容器最小寬度 `min-w-[200px] md:min-w-[280px]`（Requirement: OSAE KOMI progress bar with 15 segments）

## 4. 音效音量最大化

- [x] 4.1 在 `fighting-audience.component.ts` 的 `osaeKomiBellEffect` 中，建立 Audio 實例後設定 `volume = 1.0` 再呼叫 `play()`（Requirement: OSAE KOMI bell sound plays at maximum volume）

## 5. 驗證

- [x] 5.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻
