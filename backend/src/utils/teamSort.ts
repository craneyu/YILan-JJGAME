export const TIER_ORDER = ['EL', 'EM', 'EH', 'JH', 'SH', 'OPEN', 'ELEM'] as const;

export function tierRank(tier: string | null | undefined): number {
  if (!tier) return -1;
  const idx = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
  return idx === -1 ? 999 : idx;
}

/**
 * 錦標賽群組建構：依 team.order 升冪走訪，將連續同 (tier, category) 累積為同一群組；
 * 同一 (tier, category) 在不連續 row 重複出現時併入既有群組（保留首次出現的位置作為群組順序）。
 * 此函式不負責 sports-day——sports-day 走既有 sortTeams + category 主排序。
 */
export interface TournamentGroup<T> {
  tier: string | null;
  category: string;
  teams: T[];
}
export function buildTournamentGroups<T extends { tier?: string | null; category: string; order: number }>(
  teams: T[],
): TournamentGroup<T>[] {
  const byOrder = [...teams].sort((a, b) => a.order - b.order);
  const seen = new Map<string, TournamentGroup<T>>();
  const keyOrder: string[] = [];
  for (const t of byOrder) {
    const tier = t.tier ?? null;
    const key = `${tier ?? 'none'}:${t.category}`;
    if (!seen.has(key)) {
      seen.set(key, { tier, category: t.category, teams: [t] });
      keyOrder.push(key);
    } else {
      seen.get(key)!.teams.push(t);
    }
  }
  return keyOrder.map((k) => seen.get(k)!);
}

/** 依「二級分組 tier 優先、組別 category 次之、組內場次最後」排序隊伍。
 *  運動會隊伍 tier === null tierRank 全部相同（-1）→ 自動 fall-through 到 category 主排序，
 *  退化為本變更前的行為，運動會回歸保證。
 */
export function sortTeams<T extends { category: string; order: number; tier?: string | null }>(
  teams: T[],
  categoryOrder: string[]
): T[] {
  return [...teams].sort((a, b) => {
    const aTier = tierRank(a.tier);
    const bTier = tierRank(b.tier);
    if (aTier !== bTier) return aTier - bTier;
    const aIdx = categoryOrder.indexOf(a.category);
    const bIdx = categoryOrder.indexOf(b.category);
    const aCat = aIdx === -1 ? 999 : aIdx;
    const bCat = bIdx === -1 ? 999 : bIdx;
    if (aCat !== bCat) return aCat - bCat;
    return a.order - b.order;
  });
}

/** 依競賽類型取得有效的組別順序：優先使用該類型專屬欄位，否則回退到舊的 categoryOrder */
export function resolveCategoryOrder(
  event: {
    categoryOrder?: string[];
    categoryOrderDuo?: string[];
    categoryOrderShow?: string[];
  } | null | undefined,
  type: 'Duo' | 'Show'
): string[] {
  const specific = type === 'Duo' ? event?.categoryOrderDuo : event?.categoryOrderShow;
  if (specific && specific.length > 0) return specific;
  if (event?.categoryOrder && event.categoryOrder.length > 0) return event.categoryOrder;
  return ['female', 'male', 'mixed'];
}
