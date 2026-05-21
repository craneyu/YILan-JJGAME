/**
 * Tier code → 中文 label 對照（演武 7 級 + 寢技 8 級對齊）。
 * KID 為寢技獨有；ELEM 為舊寢技 4 級碼，仍保留供既有歷史資料顯示。
 */
const TIER_LABEL_MAP: Record<string, string> = {
  KID: '幼兒組',
  EL: '國小低年級',
  EM: '國小中年級',
  EH: '國小高年級',
  JH: '青少年國中組',
  SH: '青少年高中組',
  OPEN: '公開組',
  ELEM: '國小組',
};

export function tierLabel(tier: string | null | undefined): string {
  if (!tier) return '';
  return TIER_LABEL_MAP[tier] ?? tier;
}
