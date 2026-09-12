/**
 * 以本地時鐘量測的倒數計時器。
 *
 * 不可用 setInterval 的 tick 次數累減（每次 tick 減 1 秒）：
 * 瀏覽器對非前景分頁會節流 timer、系統負載與 timer 本身的漂移，
 * 都讓實際間隔大於 1000ms，計時因此比真實時間走得慢——
 * 裁判端切到其他視窗或分頁時最明顯，比賽時間與 15 秒壓制判定都會失準。
 *
 * 這裡改為記下結束時刻，每次 tick 都以 Date.now() 重新計算剩餘秒數：
 * 即使某幾次 tick 被延遲或跳過，數值仍然正確，恢復時會直接跳到正確值。
 * 全程只用同一台裝置的時鐘，不與伺服器時間戳相減，因此不受裝置間時鐘偏移影響。
 */
export interface Countdown {
  /** 停止倒數。可重複呼叫。 */
  stop(): void;
  /** 目前剩餘秒數（依實際經過時間計算）。 */
  remaining(): number;
}

export interface CountdownOptions {
  /** 剩餘秒數變化時呼叫（不會每個 tick 都觸發，只在整數秒改變時）。 */
  onTick: (remaining: number) => void;
  /** 倒數歸零時呼叫一次，呼叫前已自動停止。 */
  onFinish?: () => void;
  /** 取樣間隔，預設 200ms。數值由結束時刻決定，縮短取樣只影響反應速度。 */
  sampleMs?: number;
}

export function startCountdown(seconds: number, options: CountdownOptions): Countdown {
  const { onTick, onFinish, sampleMs = 200 } = options;
  const deadline = Date.now() + seconds * 1000;
  const left = (): number => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

  let last = seconds;
  let handle: ReturnType<typeof setInterval> | null = null;

  const stop = (): void => {
    if (handle !== null) {
      clearInterval(handle);
      handle = null;
    }
  };

  handle = setInterval(() => {
    const remaining = left();
    if (remaining !== last) {
      last = remaining;
      onTick(remaining);
    }
    if (remaining <= 0) {
      stop();
      onFinish?.();
    }
  }, sampleMs);

  return { stop, remaining: left };
}
