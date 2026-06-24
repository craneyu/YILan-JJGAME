/**
 * scoring 計分演算法測試：去掉最高與最低分、取中間 3 位加總。
 */
import { calculateActionScores } from "../scoring";

function judges(items: number[]) {
  return items.map((p1, i) => ({
    judgeNo: i + 1,
    items: { p1, p2: 0, p3: 0, p4: 0 },
  }));
}

describe("calculateActionScores", () => {
  it("5 位裁判：去掉最高最低，取中間 3 位加總", () => {
    const result = calculateActionScores(judges([3, 3, 2, 2, 1]));
    // p1: sort [1,2,2,3,3] → 去 1 與 3 → 2+2+3 = 7
    expect(result.p1).toBe(7);
    expect(result.actionTotal).toBe(7);
  });

  it("所有 5 位裁判都給 3：總分 = 3+3+3 = 9（單項最大）", () => {
    const result = calculateActionScores(judges([3, 3, 3, 3, 3]));
    expect(result.p1).toBe(9);
  });

  it("所有 5 位裁判都給 0：總分 0", () => {
    const result = calculateActionScores(judges([0, 0, 0, 0, 0]));
    expect(result.p1).toBe(0);
    expect(result.actionTotal).toBe(0);
  });

  it("少於 5 位裁判：該項不計入", () => {
    const result = calculateActionScores(judges([3, 3, 2]));
    expect(result.p1).toBeUndefined();
  });

  it("wrongAttack=true：所有 p1 強制 0 後計算", () => {
    const result = calculateActionScores(judges([3, 3, 3, 3, 3]), true);
    expect(result.p1).toBe(0);
    expect(result.wrongAttack).toBe(true);
  });

  it("多項加總：4 項各 9 → actionTotal = 36（A/B 系列最大）", () => {
    const allMax = [1, 2, 3, 4, 5].map((judgeNo) => ({
      judgeNo,
      items: { p1: 3, p2: 3, p3: 3, p4: 3 },
    }));
    const result = calculateActionScores(allMax);
    expect(result.actionTotal).toBe(36);
  });
});
