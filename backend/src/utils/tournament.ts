import { TeamTier } from '../models/Team';
import { MatchTier } from '../models/Match';

const ELEMENTARY_TIERS: ReadonlyArray<TeamTier> = ['EL', 'EM', 'EH'];

export function isElementaryTier(tier: TeamTier | string | null | undefined): boolean {
  if (!tier) return false;
  return ELEMENTARY_TIERS.includes(tier as TeamTier);
}

const ELEMENTARY_MOTIONS: Record<'EL' | 'EM' | 'EH', Record<'A' | 'B' | 'C', readonly string[]>> = {
  EL: { A: ['A1'], B: ['B1'], C: [] },
  EM: { A: ['A1', 'A2'], B: ['B1', 'B2'], C: [] },
  EH: { A: ['A1', 'A2', 'A3'], B: ['B1', 'B2', 'B3'], C: ['C1', 'C2', 'C3'] },
};

export function getElementaryMotions(
  tier: 'EL' | 'EM' | 'EH',
  series: 'A' | 'B' | 'C'
): readonly string[] {
  return ELEMENTARY_MOTIONS[tier][series];
}

const NE_WAZA_DEFAULT_SECONDS: Record<MatchTier, number> = {
  ELEM: 120,
  JH: 180,
  SH: 180,
  OPEN: 300,
};

export function getNeWazaDefaultDurationSeconds(tier: MatchTier): number {
  return NE_WAZA_DEFAULT_SECONDS[tier];
}

export function groupKey(category: string, tier: TeamTier | string | null | undefined): string {
  return `${category}:${tier ?? 'none'}`;
}

/**
 * 取得一隊伍完整的演武動作序列（含 A/B/C 系列）。
 * - Tournament EL/EM/EH：依國小組固定動作清單
 * - Tournament JH/OPEN / Sports-day：依性別決定每系列 3 或 4 動作（男 4、女/混 3）
 */
export function getTeamMotionSequence(
  team: { category: string; tier?: TeamTier | string | null },
  event: { meetingType?: string }
): string[] {
  if (event.meetingType === 'tournament' && team.tier) {
    if (team.tier === 'EL') return ['A1', 'B1'];
    if (team.tier === 'EM') return ['A1', 'A2', 'B1', 'B2'];
    if (team.tier === 'EH') return ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
  }
  const count = team.category === 'male' ? 4 : 3;
  const seq: string[] = [];
  for (const s of ['A', 'B', 'C']) {
    for (let i = 1; i <= count; i++) seq.push(`${s}${i}`);
  }
  return seq;
}

/**
 * 推算下一個應開放評分的動作編號：
 * - 國小低/中年級（EL/EM）：跨系列線性推進（A1→A2→B1→B2 / A1→B1），不需 VR 即可推進
 * - 國小高年級 / 國高中 / 公開組 / 運動會：
 *   - 同系列內：直接推進到下一編號
 *   - 跨系列（A→B、B→C）：
 *     - 單隊組別：VR 該系列分數送出後才推進；未送 VR 則回 null（前端顯示「等待 VR」）
 *     - 多隊組別：永遠回 null（系列邊界由 nextGroup 觸發 round:changed）
 * - 已是隊伍最後一動作：回 null（隊伍完賽，等待 nextGroup 或結束）
 */
export function computeNextAction(
  team: { category: string; tier?: TeamTier | string | null },
  event: { meetingType?: string },
  currentActionNo: string,
  options: { isSingleTeamGroup: boolean; vrSubmittedForCurrentRound: boolean }
): string | null {
  const seq = getTeamMotionSequence(team, event);
  const idx = seq.indexOf(currentActionNo);
  if (idx === -1 || idx >= seq.length - 1) return null;

  const next = seq[idx + 1];
  const currentSeries = currentActionNo[0];
  const nextSeries = next[0];

  // 同系列推進，無條件 OK
  if (currentSeries === nextSeries) return next;

  // 跨系列：EL/EM 無 VR 直接推進
  if (team.tier === 'EL' || team.tier === 'EM') return next;

  // 跨系列：其餘 tier
  if (options.isSingleTeamGroup) {
    return options.vrSubmittedForCurrentRound ? next : null;
  }
  // 多隊組別：跨系列由 nextGroup（換輪）觸發
  return null;
}
