/**
 * 創意演武計分演算法
 * - 技術分與表演分分別計算：各取 5 位裁判分數，去掉最高與最低，加總中間 3 位
 * - 違例扣分依項目歸屬扣在對應的那一項（見 PENALTY_TARGET）：
 *   超時／未達時間／使用道具 → 表演分；未達攻擊次數 → 技術分
 * - technicalTotal / artisticTotal 為「扣分後」的分數，各自不低於 0
 * - grandTotal 為扣分前的原始總分（最高 57 分：3 × 9.5 × 2），供對帳用
 * - finalScore = technicalTotal + artisticTotal
 */

import { PenaltyType, PENALTY_TARGET } from '../models/CreativePenalty';

export interface CreativeJudgeScore {
  judgeNo: number;
  technicalScore: number;
  artisticScore: number;
}

/** 一筆違例扣分（只需型別與扣分值） */
export interface CreativePenaltyItem {
  penaltyType: PenaltyType;
  deduction: number;
}

export interface CreativeCalculatedResult {
  /** 扣分前的技術分（中間三位加總） */
  technicalRaw: number;
  /** 扣分前的表演分（中間三位加總） */
  artisticRaw: number;
  /** 扣分後的技術分（不低於 0）；排名平手時以此為判斷標準 */
  technicalTotal: number;
  /** 扣分後的表演分（不低於 0） */
  artisticTotal: number;
  /** 扣分前的原始總分 */
  grandTotal: number;
  /** 扣在技術分的扣分合計 */
  technicalDeduction: number;
  /** 扣在表演分的扣分合計 */
  artisticDeduction: number;
  /** 扣分總計 */
  penaltyDeduction: number;
  finalScore: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * 對一組 5 個分數去最高最低，加總中間 3 位
 */
function middleThreeSum(scores: number[]): number {
  const sorted = [...scores].sort((a, b) => a - b);
  return sorted[1] + sorted[2] + sorted[3];
}

/**
 * 驗證分數是否合法（0–9.5，0.5 間隔）
 */
export function isValidCreativeScore(score: number): boolean {
  if (score < 0 || score > 9.5) return false;
  return Math.round(score * 2) === score * 2;
}

/**
 * 把違例扣分依歸屬拆成技術分與表演分兩筆合計
 */
export function splitPenalties(penalties: CreativePenaltyItem[]): {
  technicalDeduction: number;
  artisticDeduction: number;
} {
  let technicalDeduction = 0;
  let artisticDeduction = 0;
  for (const p of penalties) {
    if (PENALTY_TARGET[p.penaltyType] === 'technical')
      technicalDeduction += p.deduction;
    else artisticDeduction += p.deduction;
  }
  return {
    technicalDeduction: round1(technicalDeduction),
    artisticDeduction: round1(artisticDeduction),
  };
}

/**
 * 計算創意演武最終分數
 */
export function calculateCreativeScore(
  judgeScores: CreativeJudgeScore[],
  penalties: CreativePenaltyItem[]
): CreativeCalculatedResult {
  const technicalRaw = round1(
    middleThreeSum(judgeScores.map((s) => s.technicalScore))
  );
  const artisticRaw = round1(
    middleThreeSum(judgeScores.map((s) => s.artisticScore))
  );
  const grandTotal = round1(technicalRaw + artisticRaw);

  const { technicalDeduction, artisticDeduction } = splitPenalties(penalties);
  const technicalTotal = Math.max(0, round1(technicalRaw - technicalDeduction));
  const artisticTotal = Math.max(0, round1(artisticRaw - artisticDeduction));

  return {
    technicalRaw,
    artisticRaw,
    technicalTotal,
    artisticTotal,
    grandTotal,
    technicalDeduction,
    artisticDeduction,
    penaltyDeduction: round1(technicalDeduction + artisticDeduction),
    finalScore: round1(technicalTotal + artisticTotal),
  };
}
