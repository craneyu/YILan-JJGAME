import { Match, MatchCategory } from "../models/match.model";

export interface WeightGroup {
  weightClass: string;
  matches: Match[];
}

export interface CategoryGroup {
  category: MatchCategory;
  label: string;
  weightGroups: WeightGroup[];
}

// 量級排序使用固定索引表（依規格表順序）
const MALE_WEIGHT_ORDER: string[] = [
  "-56 公斤級",
  "-62 公斤級",
  "-69 公斤級",
  "-77 公斤級",
  "-85 公斤級",
  "-94 公斤級",
  "+94 公斤級",
];

const FEMALE_WEIGHT_ORDER: string[] = [
  "-49 公斤級",
  "-55 公斤級",
  "-62 公斤級",
  "-70 公斤級",
  "+70 公斤級",
];

const CATEGORY_LABELS: Record<MatchCategory, string> = {
  male: "男子組",
  female: "女子組",
  mixed: "混合組",
};

// 組別順序：male → female → mixed
const CATEGORY_ORDER: MatchCategory[] = ["male", "female", "mixed"];

function getWeightOrder(category: MatchCategory, weightClass: string): number {
  const order =
    category === "male"
      ? MALE_WEIGHT_ORDER
      : category === "female"
        ? FEMALE_WEIGHT_ORDER
        : [];
  const idx = order.indexOf(weightClass);
  return idx === -1 ? 9999 : idx;
}

export function groupMatchesByCategory(matches: Match[]): CategoryGroup[] {
  const categoryMap = new Map<MatchCategory, Match[]>();
  for (const m of matches) {
    if (!categoryMap.has(m.category)) categoryMap.set(m.category, []);
    categoryMap.get(m.category)!.push(m);
  }

  const result: CategoryGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catMatches = categoryMap.get(cat);
    if (!catMatches || catMatches.length === 0) continue;

    const weightMap = new Map<string, Match[]>();
    for (const m of catMatches) {
      if (!weightMap.has(m.weightClass)) weightMap.set(m.weightClass, []);
      weightMap.get(m.weightClass)!.push(m);
    }

    const weightGroups: WeightGroup[] = Array.from(weightMap.entries())
      .sort(([wA], [wB]) => getWeightOrder(cat, wA) - getWeightOrder(cat, wB))
      .map(([weightClass, wMatches]) => ({
        weightClass,
        matches: wMatches.slice().sort((a, b) => a.scheduledOrder - b.scheduledOrder),
      }));

    result.push({ category: cat, label: CATEGORY_LABELS[cat], weightGroups });
  }

  return result;
}
