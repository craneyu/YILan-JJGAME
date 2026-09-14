#!/usr/bin/env python3
"""e2e-scoring.sh 的驗算部分：比對 API 回傳與手算的期望值。

期望值由 e2e-scoring.sh 送出的評分推導而來，兩者必須一起改：
  傳統演武 每項 5 位裁判同分 → 中間三位 = 該分數 × 3
  創意演武 5 位裁判同分       → 中間三位 = 該分數 × 3
"""
import json
import sys
from pathlib import Path

work = Path(sys.argv[1])
failures = []


def check(label, actual, expected):
    ok = actual == expected
    print(f"      {'PASS' if ok else 'FAIL'}  {label}: {actual}" + ("" if ok else f"（預期 {expected}）"))
    if not ok:
        failures.append(label)


def load(name):
    return json.loads((work / name).read_text())["data"]


def by_name(rows):
    return {r["name"]: r for r in rows}


# ── 傳統演武 ──
print("    傳統演武")
duo = by_name(load("duo_admin.json"))

a = duo["演武A隊"]
# A1~A3：每項 2 分 × 3 = 6，4 項 = 24；A4 錯誤攻擊 → p1 歸 0 → 18
check("A 隊 A 系列合計", a["seriesA"], 90)
check("A 隊 VR_A", a.get("vrScoreA"), 4)
check("A 隊 總分", a["total"], 94)
check("A 隊 A4 錯誤攻擊後 p1", a["actionDetails"]["A4"]["p1"], 0)
check("A 隊 A4 動作小計", a["actionDetails"]["A4"]["total"], 18)
check("A 隊 已評分動作數", a.get("scoredActionCount"), 4)
check("A 隊 棄權輪次", a.get("abstainedRounds"), [])

b = duo["演武B隊"]
# A1/A2：3/2/2/1 → 9/6/6/3 = 24，兩動作 48
check("B 隊 A 系列合計", b["seriesA"], 48)
check("B 隊 總分", b["total"], 48)
check("B 隊 棄權輪次（第 1 輪）", b.get("abstainedRounds"), [1])
check("B 隊 VR_A（棄權跳過 VR）", b.get("vrScoreA"), 0)
check("B 隊 已評分動作數", b.get("scoredActionCount"), 2)

c = duo["演武C隊"]
check("C 隊 總分", c["total"], 0)
check("C 隊 已評分動作數（完全未評分）", c.get("scoredActionCount"), 0)

# ── 創意演武 ──
print("    創意演武")
show = load("show_admin.json")
show_by_name = by_name(show)

# A：技 8.0×3=24 表 7.5×3=22.5，超時 -1.0 扣表演 → 24.0 / 21.5 / 45.5
# B：技 8.5×3=25.5 表 7.0×3=21，未達攻擊 -0.5 扣技術 → 25.0 / 21.0 / 46.0
# C：技 7.0×3=21 表 8.5×3=25.5，道具 -1.0 扣表演、未達攻擊 -0.5 扣技術 → 20.5 / 24.5 / 45.0
expected = {
    "創意A隊": dict(technicalRaw=24.0, artisticRaw=22.5, technicalDeduction=0,
                    artisticDeduction=1.0, technicalTotal=24.0, artisticTotal=21.5,
                    finalScore=45.5, rank=2),
    "創意B隊": dict(technicalRaw=25.5, artisticRaw=21.0, technicalDeduction=0.5,
                    artisticDeduction=0, technicalTotal=25.0, artisticTotal=21.0,
                    finalScore=46.0, rank=1),
    "創意C隊": dict(technicalRaw=21.0, artisticRaw=25.5, technicalDeduction=0.5,
                    artisticDeduction=1.0, technicalTotal=20.5, artisticTotal=24.5,
                    finalScore=45.0, rank=3),
}
for name, exp in expected.items():
    row = show_by_name[name]
    for field, want in exp.items():
        check(f"{name} {field}", row[field], want)

print("    對帳等式")
check("技術分 + 表演分 = 最終得分",
      all(abs(t["technicalTotal"] + t["artisticTotal"] - t["finalScore"]) < 1e-9 for t in show), True)
check("原始總分 − 總扣分 = 最終得分",
      all(abs(t["grandTotal"] - t["penaltyDeduction"] - t["finalScore"]) < 1e-9 for t in show), True)

# ── 權限：裁判逐項評分僅 admin 可見，排名本身對所有人公開 ──
print("    權限")
for label, fname, key in [
    ("傳統演武 匿名", "duo_anon.json", "judgeDetails"),
    ("傳統演武 audience 角色", "duo_aud.json", "judgeDetails"),
    ("創意演武 匿名", "show_anon.json", "judgeScores"),
    ("創意演武 audience 角色", "show_aud.json", "judgeScores"),
]:
    rows = load(fname)
    check(f"{label} 看不到 {key}", any(key in r for r in rows), False)
    check(f"{label} 仍拿得到排名（3 隊）", len(rows), 3)
for label, fname, key in [
    ("傳統演武 admin", "duo_admin.json", "judgeDetails"),
    ("創意演武 admin", "show_admin.json", "judgeScores"),
]:
    check(f"{label} 看得到 {key}", any(key in r for r in load(fname)), True)

if failures:
    print(f"\n      {len(failures)} 項驗算失敗：" + "、".join(failures))
    sys.exit(1)
sys.exit(0)
