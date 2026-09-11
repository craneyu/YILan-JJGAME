import { trimPlayer } from "../matchController";

describe("trimPlayer", () => {
  it("去除姓名與隊名的前後空白", () => {
    expect(trimPlayer({ name: " 王小明 ", teamName: "宜蘭縣國華國中 " })).toEqual({
      name: "王小明",
      teamName: "宜蘭縣國華國中",
    });
  });

  it("保留其他欄位", () => {
    expect(trimPlayer({ name: "王小明 ", teamName: "A隊", seed: 3 })).toEqual({
      name: "王小明",
      teamName: "A隊",
      seed: 3,
    });
  });

  it("空字串選手（輪空場次）維持空字串", () => {
    expect(trimPlayer({ name: "", teamName: "" })).toEqual({ name: "", teamName: "" });
  });

  it("非物件輸入原樣回傳", () => {
    expect(trimPlayer(undefined)).toBeUndefined();
    expect(trimPlayer(null)).toBeNull();
    expect(trimPlayer("王小明")).toBe("王小明");
  });
});
