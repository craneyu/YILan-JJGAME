## 1. 音效檔作為靜態資源 (Sound Assets)

- [x] 1.1 [P] 新增 `frontend/src/assets/sounds/bell-long.mp3` 長鈴音效檔（主計時歸零用，sound assets）
- [x] 1.2 [P] 新增 `frontend/src/assets/sounds/bell-short.mp3` 短音音效檔（壓制計時歸零用，sound assets）

## 2. 使用 effect() 偵測歸零時機：Main timer bell on zero

- [x] 2.1 [P] 在 `contact-audience.component.ts` 使用 effect() 偵測歸零時機，實作 main timer bell on zero：`timerRemaining` 從 >0 降至 0 時，使用 HTMLAudioElement 播放音效 `bell-long.mp3`，並以 graceful handling of autoplay restriction 捕捉 rejected promise
- [x] 2.2 [P] 在 `fighting-audience.component.ts` 使用 effect() 偵測歸零時機，實作 main timer bell on zero：`timerRemaining` 從 >0 降至 0 時，使用 HTMLAudioElement 播放音效 `bell-long.mp3`，並以 graceful handling of autoplay restriction 捕捉 rejected promise
- [x] 2.3 [P] 在 `ne-waza-audience.component.ts` 使用 effect() 偵測歸零時機，實作 main timer bell on zero：`timerRemaining` 從 >0 降至 0 時，使用 HTMLAudioElement 播放音效 `bell-long.mp3`，並以 graceful handling of autoplay restriction 捕捉 rejected promise

## 3. 使用 HTMLAudioElement 播放音效：OSAE KOMI bell on zero

- [x] 3.1 在 `fighting-audience.component.ts` 使用 effect() 偵測歸零時機，實作 OSAE KOMI bell on zero：`redOsaeKomiRemaining` 或 `blueOsaeKomiRemaining` 從 >0 降至 0 時，使用 HTMLAudioElement 播放音效 `bell-short.mp3`，並以 graceful handling of autoplay restriction 捕捉 rejected promise

## 4. 驗證

- [x] 4.1 執行 `cd frontend && npm run build`，確認 Initial bundle 未超過 500kB 警告門檻，確認音效檔作為靜態資源出現在 `dist/` 輸出目錄
