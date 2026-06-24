/**
 * match-grouping 排序與分組 helper 測試。
 * 對應 match-list-completion-ux change 的核心邏輯：status-aware 排序。
 */
import { Match, MatchStatus } from "../models/match.model";
import { groupMatchesByCategory } from "./match-grouping";

function makeMatch(
  matchNo: number,
  status: MatchStatus,
  category: "male" | "female" | "mixed" = "male",
  weightClass = "-77 公斤級",
  scheduledOrder?: number,
): Match {
  return {
    _id: `match-${matchNo}`,
    eventId: "event-1",
    matchType: "fighting",
    category,
    tier: "OPEN",
    weightClass,
    round: 1,
    matchNo,
    scheduledOrder: scheduledOrder ?? matchNo,
    redPlayer: { name: `R${matchNo}`, teamName: "TeamR" },
    bluePlayer: { name: `B${matchNo}`, teamName: "TeamB" },
    status,
    isBye: false,
  } as Match;
}

describe("groupMatchesByCategory", () => {
  it("依 category 順序：male → female → mixed", () => {
    const groups = groupMatchesByCategory([
      makeMatch(1, "pending", "mixed"),
      makeMatch(2, "pending", "female"),
      makeMatch(3, "pending", "male"),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["male", "female", "mixed"]);
  });

  it("無資料的 category 不渲染 header", () => {
    const groups = groupMatchesByCategory([
      makeMatch(1, "pending", "male"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("male");
  });

  it("in-progress 與 pending 浮頂、completed 沉底（同 weight class 內）", () => {
    const groups = groupMatchesByCategory([
      makeMatch(1, "completed", "male", "-77 公斤級", 1),
      makeMatch(2, "pending", "male", "-77 公斤級", 2),
      makeMatch(3, "completed", "male", "-77 公斤級", 3),
      makeMatch(4, "in-progress", "male", "-77 公斤級", 4),
    ]);
    const order = groups[0].weightGroups[0].matches.map((m) => m.matchNo);
    // spec example：M4 (in-progress 4), M2 (pending 2), M1 (completed 1), M3 (completed 3)
    expect(order).toEqual([4, 2, 1, 3]);
  });

  it("同 status 內依 scheduledOrder 由小到大", () => {
    const groups = groupMatchesByCategory([
      makeMatch(1, "pending", "male", "-77 公斤級", 3),
      makeMatch(2, "pending", "male", "-77 公斤級", 1),
      makeMatch(3, "pending", "male", "-77 公斤級", 2),
    ]);
    const order = groups[0].weightGroups[0].matches.map((m) => m.matchNo);
    expect(order).toEqual([2, 3, 1]);
  });

  it("weight class 依規格表順序：-56 → -62 → -69 → -77 → -85 → -94 → +94", () => {
    const groups = groupMatchesByCategory([
      makeMatch(1, "pending", "male", "+94 公斤級"),
      makeMatch(2, "pending", "male", "-56 公斤級"),
      makeMatch(3, "pending", "male", "-77 公斤級"),
    ]);
    const weights = groups[0].weightGroups.map((g) => g.weightClass);
    expect(weights).toEqual(["-56 公斤級", "-77 公斤級", "+94 公斤級"]);
  });
});
