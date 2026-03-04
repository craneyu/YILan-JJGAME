/**
 * 創意演武計分演算法
 * - 技術分與表演分分別計算
 * - 各取 5 位裁判分數，去掉最高分和最低分，加總中間 3 位
 * - grandTotal = technicalTotal + artisticTotal（最高 57 分：3 × 9.5 × 2）
 * - finalScore = max(0, grandTotal - totalPenaltyDeduction)
 */

export interface CreativeJudgeScore {
  judgeNo: number;
  technicalScore: number;
  artisticScore: number;
}

export interface CreativeCalculatedResult {
  technicalTotal: number;
  artisticTotal: number;
  grandTotal: number;
  penaltyDeduction: number;
  finalScore: number;
}

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
 * 計算創意演武最終分數
 */
export function calculateCreativeScore(
  judgeScores: CreativeJudgeScore[],
  penaltyDeduction: number
): CreativeCalculatedResult {
  const technicalScores = judgeScores.map((s) => s.technicalScore);
  const artisticScores = judgeScores.map((s) => s.artisticScore);

  const technicalTotal = Math.round(middleThreeSum(technicalScores) * 10) / 10;
  const artisticTotal = Math.round(middleThreeSum(artisticScores) * 10) / 10;
  const grandTotal = Math.round((technicalTotal + artisticTotal) * 10) / 10;
  const finalScore = Math.max(0, Math.round((grandTotal - penaltyDeduction) * 10) / 10);

  return { technicalTotal, artisticTotal, grandTotal, penaltyDeduction, finalScore };
}
