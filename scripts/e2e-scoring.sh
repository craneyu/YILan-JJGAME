#!/bin/bash
# 評分到匯出的端對端測試：從零建立賽事，全程走真實 API 產生分數，再驗算所有結果。
#
# 涵蓋範圍：
#   傳統演武 — 開放動作、5 位裁判評分、VR 多樣性、錯誤攻擊、棄權、換組、完全未評分的隊伍
#   創意演武 — 開放評分、計時、違例扣分（技術／表演兩邊）、5 位裁判評分
#   排名     — 扣分歸屬、平分以技術分決勝、未評分與棄權的排除
#   權限     — judgeDetails / judgeScores 僅 admin 可見
#
# 不涵蓋：瀏覽器 UI（觀眾端畫面、匯出按鈕）。本腳本驗證的是 API 回傳的資料，
# 匯出表的內容由那份資料算出，因此資料正確即可涵蓋大部分匯出邏輯。
#
# 用法：./scripts/e2e-scoring.sh
# 退出碼：0 全部通過；非 0 有驗算失敗。

set -e

# ── 安全邊界：只碰專用的測試資料庫與測試 port，絕不碰正式資料 ──
TEST_DB="jju_e2e"
TEST_PORT=3001
MONGO_CONTAINER="${MONGO_CONTAINER:-jju-mongo}"
API="localhost:${TEST_PORT}/api/v1"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
BACKEND_PID=""
FAILURES=0

if [ "$TEST_DB" = "jju" ]; then
  echo "錯誤：測試資料庫名稱不得為正式資料庫 'jju'"
  exit 1
fi

cleanup() {
  local code=$?
  echo ""
  echo "=== 清理 ==="
  # npm run dev 會派生 nodemon 與 ts-node，kill 啟動用的 subshell 殺不掉孫程序，
  # 因此改以 port 精準清除佔用者
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  local port_pids
  port_pids=$(lsof -ti:${TEST_PORT} 2>/dev/null || true)
  if [ -n "$port_pids" ]; then
    echo "$port_pids" | xargs kill 2>/dev/null || true
    sleep 2
    port_pids=$(lsof -ti:${TEST_PORT} 2>/dev/null || true)
    [ -n "$port_pids" ] && echo "$port_pids" | xargs kill -9 2>/dev/null || true
    echo "      已停止測試後端（port ${TEST_PORT}）"
  fi
  docker exec -i "$MONGO_CONTAINER" mongosh --quiet --eval "
    const name = '${TEST_DB}';
    if (name === 'jju') { throw new Error('拒絕刪除正式資料庫'); }
    db.getSiblingDB(name).dropDatabase();
  " >/dev/null 2>&1 && echo "      已刪除測試資料庫 ${TEST_DB}" || echo "      測試資料庫清理略過"
  rm -rf "$WORK"
  exit $code
}
trap cleanup EXIT

echo "=== 評分到匯出 端對端測試 ==="
echo "    測試資料庫：${TEST_DB}（與正式 jju 完全隔離）"
echo "    測試後端  ：port ${TEST_PORT}"
echo ""

# ── 前置檢查 ──
echo "[1/6] 前置檢查..."
if ! docker ps --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER"; then
  echo "錯誤：找不到執行中的 MongoDB 容器 '${MONGO_CONTAINER}'"
  echo "      請先啟動：docker start ${MONGO_CONTAINER}"
  exit 1
fi
if lsof -nP -iTCP:${TEST_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "錯誤：port ${TEST_PORT} 已被佔用，請先關閉佔用的程序"
  exit 1
fi
echo "      MongoDB 容器與 port ${TEST_PORT} 皆就緒"

# ── 建立賽事與隊伍（只建結構，分數全部走 API 產生）──
echo "[2/6] 建立測試賽事與隊伍..."
docker exec -i "$MONGO_CONTAINER" mongosh --quiet > "$WORK/ids.raw" <<MONGOEOF
db = db.getSiblingDB('${TEST_DB}');
db.dropDatabase();
const eid = ObjectId();
db.events.insertOne({ _id: eid, name: '端對端測試賽', rounds: 3, status: 'active',
  categoryOrder: ['female','male','mixed'], categoryOrderDuo: [], categoryOrderShow: [],
  competitionTypes: ['Duo','Show'], meetingType: 'tournament',
  includedSports: ['kata-duo','kata-show'], createdAt: new Date(), updatedAt: new Date() });
const mk = (name, order, type, tier) => {
  const id = ObjectId();
  db.teams.insertOne({ _id: id, eventId: eid, name, members: [
    { name: name + '甲', weighInStatus: 'n/a', checkInStatus: 'pending' },
    { name: name + '乙', weighInStatus: 'n/a', checkInStatus: 'pending' }],
    category: 'male', order, competitionType: type, tier });
  return id;
};
print('EVENT=' + eid.toHexString());
print('DUO_A=' + mk('演武A隊', 1, 'Duo', 'JH').toHexString());
print('DUO_B=' + mk('演武B隊', 2, 'Duo', 'JH').toHexString());
print('DUO_C=' + mk('演武C隊', 3, 'Duo', 'JH').toHexString());
print('SHOW_A=' + mk('創意A隊', 1, 'Show', 'JH').toHexString());
print('SHOW_B=' + mk('創意B隊', 2, 'Show', 'JH').toHexString());
print('SHOW_C=' + mk('創意C隊', 3, 'Show', 'JH').toHexString());
MONGOEOF
# mongosh 會在每行前加上 prompt（例如 "jju_e2e> "），必須去掉才能當成 shell 變數載入
sed 's/^[^ ]*> //' "$WORK/ids.raw" | grep -E '^[A-Z_]+=[0-9a-f]{24}$' | sed 's/^/export /' > "$WORK/ids.sh"
# shellcheck disable=SC1090
. "$WORK/ids.sh"
if [ -z "${EVENT:-}" ] || [ -z "${SHOW_C:-}" ]; then
  echo "錯誤：未能取得測試賽事的 ID，mongosh 原始輸出如下"
  cat "$WORK/ids.raw"
  exit 1
fi
echo "      賽事 ${EVENT}，傳統演武 3 隊、創意演武 3 隊"

# ── 啟動測試後端 ──
echo "[3/6] 啟動測試後端..."
(cd "$ROOT/backend" && PORT=$TEST_PORT MONGO_URI="mongodb://localhost:27017/${TEST_DB}" npm run dev > "$WORK/backend.log" 2>&1) &
BACKEND_PID=$!
disown "$BACKEND_PID" 2>/dev/null || true  # 避免清理時 bash 印出 Terminated 通知
if ! curl -s --retry 60 --retry-delay 1 --retry-connrefused -m 120 -o /dev/null "$API/events"; then
  echo "錯誤：測試後端啟動失敗，log 如下"
  tail -20 "$WORK/backend.log"
  exit 1
fi
echo "      後端已就緒（pid $BACKEND_PID）"

# ── 取得各角色 token ──
tok() {
  curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$2\"}" |
    python3 -c "import json,sys; print(json.load(sys.stdin)['data']['token'])"
}
SEQ=$(tok seq seq123)
VR=$(tok vr vr123)
ADMIN=$(tok admin admin123)
AUDIENCE=$(tok audience audience123)
declare -a JUDGE
for n in 1 2 3 4 5; do JUDGE[$n]=$(tok "judge$n" judge123); done

# ── 傳統演武 ──
echo "[4/6] 傳統演武評分流程..."
open_action() {
  curl -s -X POST "$API/flow/open-action" -H "Authorization: Bearer $SEQ" -H 'Content-Type: application/json' \
    -d "{\"eventId\":\"$EVENT\",\"teamId\":\"$1\",\"round\":$2,\"actionNo\":\"$3\"}" -o /dev/null
}
score_action() { # teamId round actionNo p1 p2 p3 p4
  for n in 1 2 3 4 5; do
    curl -s -X POST "$API/scores" -H "Authorization: Bearer ${JUDGE[$n]}" -H 'Content-Type: application/json' \
      -d "{\"eventId\":\"$EVENT\",\"teamId\":\"$1\",\"round\":$2,\"actionNo\":\"$3\",\"items\":{\"p1\":$4,\"p2\":$5,\"p3\":$6,\"p4\":$7}}" -o /dev/null
  done
}

# A 隊：A1~A4 全評（各項 2 分 → 中間三位 6 分、每動作 24 分），VR 2+2，A4 標記錯誤攻擊
for i in 1 2 3 4; do open_action "$DUO_A" 1 "A$i"; score_action "$DUO_A" 1 "A$i" 2 2 2 2; done
curl -s -X POST "$API/vr-scores" -H "Authorization: Bearer $VR" -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT\",\"teamId\":\"$DUO_A\",\"round\":1,\"throwVariety\":2,\"groundVariety\":2}" -o /dev/null
curl -s -X POST "$API/wrong-attacks" -H "Authorization: Bearer $VR" -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT\",\"teamId\":\"$DUO_A\",\"round\":1,\"actionNo\":\"A4\"}" -o /dev/null
echo "      A 隊：4 動作評分完成、VR 已送、A4 標記錯誤攻擊"

curl -s -X POST "$API/flow/next-group" -H "Authorization: Bearer $SEQ" -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT\"}" -o /dev/null
# B 隊：只評 A1、A2（各項 3/2/2/1 → 9/6/6/3、每動作 24 分）後棄權
for i in 1 2; do open_action "$DUO_B" 1 "A$i"; score_action "$DUO_B" 1 "A$i" 3 2 2 1; done
curl -s -X POST "$API/flow/abstain" -H "Authorization: Bearer $SEQ" -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT\"}" -o /dev/null
echo "      B 隊：2 動作評分完成後棄權（第 1 輪）"
echo "      C 隊：完全不評分"

# ── 創意演武 ──
echo "[5/6] 創意演武評分流程..."
run_show_team() { # teamId technical artistic penaltiesJson label
  curl -s -X POST "$API/creative/flow/open-scoring" -H "Authorization: Bearer $SEQ" -H 'Content-Type: application/json' \
    -d "{\"eventId\":\"$EVENT\",\"teamId\":\"$1\"}" -o /dev/null
  curl -s -X POST "$API/creative/flow/start-timer" -H "Authorization: Bearer $SEQ" -H 'Content-Type: application/json' \
    -d "{\"eventId\":\"$EVENT\"}" -o /dev/null
  curl -s -X POST "$API/creative/flow/stop-timer" -H "Authorization: Bearer $SEQ" -H 'Content-Type: application/json' \
    -d "{\"eventId\":\"$EVENT\"}" -o /dev/null
  curl -s -X POST "$API/creative/penalties" -H "Authorization: Bearer $SEQ" -H 'Content-Type: application/json' \
    -d "{\"eventId\":\"$EVENT\",\"teamId\":\"$1\",\"penalties\":$4}" -o /dev/null
  for n in 1 2 3 4 5; do
    curl -s -X POST "$API/creative-scores" -H "Authorization: Bearer ${JUDGE[$n]}" -H 'Content-Type: application/json' \
      -d "{\"eventId\":\"$EVENT\",\"teamId\":\"$1\",\"technicalScore\":$2,\"artisticScore\":$3}" -o /dev/null
  done
  echo "      $5"
}
run_show_team "$SHOW_A" 8.0 7.5 '["overtime"]'        "A 隊：超時（扣表演分）"
run_show_team "$SHOW_B" 8.5 7.0 '["attacks"]'         "B 隊：未達攻擊次數（扣技術分）"
run_show_team "$SHOW_C" 7.0 8.5 '["props","attacks"]' "C 隊：道具＋未達攻擊次數（兩邊都扣）"

# ── 驗算 ──
echo "[6/6] 驗算結果..."
curl -s -H "Authorization: Bearer $ADMIN" "$API/events/$EVENT/rankings" -o "$WORK/duo_admin.json"
curl -s -H "Authorization: Bearer $ADMIN" "$API/events/$EVENT/creative-rankings" -o "$WORK/show_admin.json"
curl -s "$API/events/$EVENT/rankings" -o "$WORK/duo_anon.json"
curl -s "$API/events/$EVENT/creative-rankings" -o "$WORK/show_anon.json"
curl -s -H "Authorization: Bearer $AUDIENCE" "$API/events/$EVENT/rankings" -o "$WORK/duo_aud.json"
curl -s -H "Authorization: Bearer $AUDIENCE" "$API/events/$EVENT/creative-rankings" -o "$WORK/show_aud.json"

python3 "$ROOT/scripts/e2e-assert.py" "$WORK" || FAILURES=1

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "=== 全部通過 ==="
else
  echo "=== 有驗算失敗，見上方 FAIL 行 ==="
fi
exit $FAILURES
