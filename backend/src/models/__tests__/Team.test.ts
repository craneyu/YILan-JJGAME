/**
 * Team model helper 純函式測試（不需 MongoDB）。
 */
import {
  buildMembersFromNames,
  defaultWeighInStatus,
  memberNames,
  computeTeamCheckedIn,
  IMember,
} from "../Team";

function member(
  name: string,
  checkInStatus: IMember["checkInStatus"] = "pending",
  weighInStatus: IMember["weighInStatus"] = "pending",
): IMember {
  return { name, weighInStatus, checkInStatus };
}

describe("defaultWeighInStatus", () => {
  it("Duo 演武 team → 'n/a'", () => {
    expect(defaultWeighInStatus("Duo")).toBe("n/a");
  });

  it("Show 演武 team → 'n/a'", () => {
    expect(defaultWeighInStatus("Show")).toBe("n/a");
  });

  it("空值或非演武 → 'pending'", () => {
    expect(defaultWeighInStatus(null)).toBe("pending");
    expect(defaultWeighInStatus(undefined)).toBe("pending");
  });
});

describe("buildMembersFromNames", () => {
  it("Duo team 升級：成員 weighInStatus 為 'n/a'", () => {
    const members = buildMembersFromNames(["Alice", "Bob"], "Duo");
    expect(members).toHaveLength(2);
    expect(members[0]).toEqual({
      name: "Alice",
      weighInStatus: "n/a",
      checkInStatus: "pending",
    });
    expect(members[1].weighInStatus).toBe("n/a");
  });

  it("非演武（null competitionType）：weighInStatus 為 'pending'", () => {
    const members = buildMembersFromNames(["Alice"], null);
    expect(members[0].weighInStatus).toBe("pending");
    expect(members[0].checkInStatus).toBe("pending");
  });

  it("空名單回傳空陣列", () => {
    expect(buildMembersFromNames([], "Duo")).toEqual([]);
  });
});

describe("memberNames", () => {
  it("IMember[] → string[]（取 name 欄）", () => {
    const members: IMember[] = [
      { name: "Alice", weighInStatus: "pending", checkInStatus: "pending" },
      { name: "Bob", weighInStatus: "passed", checkInStatus: "present" },
    ];
    expect(memberNames(members)).toEqual(["Alice", "Bob"]);
  });

  it("空陣列 → 空陣列", () => {
    expect(memberNames([])).toEqual([]);
  });
});

describe("computeTeamCheckedIn（演武團體計）", () => {
  it("全部成員 present → true", () => {
    const result = computeTeamCheckedIn([
      member("Alice", "present"),
      member("Bob", "present"),
    ]);
    expect(result).toBe(true);
  });

  it("Duo 一位 present、一位 absent → false（spec 8.2 場景）", () => {
    const result = computeTeamCheckedIn([
      member("Alice", "present"),
      member("Bob", "absent"),
    ]);
    expect(result).toBe(false);
  });

  it("Duo 一位 present、一位 pending → false", () => {
    const result = computeTeamCheckedIn([
      member("Alice", "present"),
      member("Bob", "pending"),
    ]);
    expect(result).toBe(false);
  });

  it("全部 pending → false", () => {
    const result = computeTeamCheckedIn([
      member("Alice", "pending"),
      member("Bob", "pending"),
    ]);
    expect(result).toBe(false);
  });

  it("空陣列 → true（vacuously 滿足）", () => {
    expect(computeTeamCheckedIn([])).toBe(true);
  });
});
