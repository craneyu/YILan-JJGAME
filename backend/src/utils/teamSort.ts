/** 依「組別順序優先、組內場次次之」排序隊伍 */
export function sortTeams<T extends { category: string; order: number }>(
  teams: T[],
  categoryOrder: string[]
): T[] {
  return [...teams].sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a.category);
    const bIdx = categoryOrder.indexOf(b.category);
    const aCat = aIdx === -1 ? 999 : aIdx;
    const bCat = bIdx === -1 ? 999 : bIdx;
    if (aCat !== bCat) return aCat - bCat;
    return a.order - b.order;
  });
}
