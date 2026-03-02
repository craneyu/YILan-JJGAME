import { IScoreItems } from '../models/Score';

export interface CalculatedScore {
  actionNo: string;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  actionTotal: number;
  wrongAttack?: boolean;
}

export function calculateActionScores(
  allScores: Array<{ judgeNo: number; items: IScoreItems }>,
  wrongAttack = false
): Omit<CalculatedScore, 'actionNo'> {
  // 若為錯誤攻擊，所有裁判的 p1 強制為 0
  const scores = wrongAttack
    ? allScores.map((s) => ({ ...s, items: { ...s.items, p1: 0 } }))
    : allScores;

  const itemKeys: (keyof IScoreItems)[] = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const result: Partial<Record<keyof IScoreItems, number>> = {};
  let actionTotal = 0;

  for (const key of itemKeys) {
    const values = scores
      .map((s) => s.items[key])
      .filter((v): v is number => v !== undefined && v !== null);

    if (values.length === 5) {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.slice(1, 4).reduce((a, b) => a + b, 0);
      result[key] = sum;
      actionTotal += sum;
    }
  }

  return { ...result, actionTotal, ...(wrongAttack && { wrongAttack: true }) };
}
