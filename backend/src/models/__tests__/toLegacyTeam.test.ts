import { IMember, toLegacyTeam } from "../../models/Team";

const member = (name: string): IMember => ({
  name,
  weighInStatus: "n/a",
  checkInStatus: "pending",
});

describe("toLegacyTeam", () => {
  it("將 IMember[] 轉為姓名字串陣列", () => {
    const result = toLegacyTeam({
      name: "宜蘭縣國華國中",
      members: [member("王小明"), member("李小華")],
    });
    expect(result["members"]).toEqual(["王小明", "李小華"]);
  });

  it("保留其他欄位", () => {
    const result = toLegacyTeam({
      name: "新北市柔術委員會",
      members: [member("王小明")],
      category: "male",
      order: 1,
    });
    expect(result["name"]).toBe("新北市柔術委員會");
    expect(result["category"]).toBe("male");
    expect(result["order"]).toBe(1);
  });

  it("未 migrate 的純字串 members 原樣輸出", () => {
    const result = toLegacyTeam({ name: "舊資料隊", members: ["王小明", "李小華"] });
    expect(result["members"]).toEqual(["王小明", "李小華"]);
  });

  it("members 缺漏時回空陣列", () => {
    expect(toLegacyTeam({ name: "無成員" })["members"]).toEqual([]);
  });

  it("支援 mongoose document（透過 toObject）", () => {
    const doc = {
      toObject: () => ({ name: "文件隊", members: [member("王小明")] }),
    };
    expect(toLegacyTeam(doc)).toEqual({ name: "文件隊", members: ["王小明"] });
  });
});
