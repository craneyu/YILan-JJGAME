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
