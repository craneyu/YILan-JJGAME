import { Request, Response } from "express";
import MatchScoreLog from "../models/MatchScoreLog";
import Match from "../models/Match";
import { broadcast } from "../sockets/index";

// ─── helper ─────────────────────────────────────────────────────────────────

function isFinished(status: string) {
  return status === "completed";
}

function isPendingOrActive(status: string) {
  return ["pending", "in-progress", "full-ippon-pending", "shido-dq-pending"].includes(status);
}

// ─── PART 計分 ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/match-scores/part
 * body: { matchId, side, partIndex: 1|2|3|null, delta: number }
 *   partIndex = null → ALL PARTS（直接加減總分，不計入 PART，IPPON 不變）
 */
export async function partScore(req: Request, res: Response): Promise<void> {
  const { matchId, side, partIndex, delta } = req.body as {
    matchId: string;
    side: "red" | "blue";
    partIndex: 1 | 2 | 3 | null;
    delta: number;
  };

  if (!matchId || !side || delta === undefined) {
    res.status(400).json({ success: false, error: "缺少必填欄位" });
    return;
  }
  if (!["red", "blue"].includes(side)) {
    res.status(400).json({ success: false, error: "side 須為 red 或 blue" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) { res.status(404).json({ success: false, error: "找不到場次" }); return; }
  if (isFinished(match.status)) {
    res.status(409).json({ success: false, error: "場次已結束，不可新增得分記錄" });
    return;
  }

  const isRed = side === "red";
  const ipponKey = isRed ? "redIppons" : "blueIppons";

  // 防負數檢查
  if (delta < 0) {
    const counterKey = `${side}PartCounters` as "redPartCounters" | "bluePartCounters";
    const rawCounters = (match[counterKey] as any) || { p1: { plus2: 0, plus3: 0 }, p2: { plus2: 0, plus3: 0 }, p3: { plus2: 0, plus3: 0 } };
    const counters = rawCounters;

    if (partIndex === 1) {
      const part1Score = isRed ? match.redPart1Score : match.bluePart1Score;
      if (part1Score + delta < 0) {
        res.status(400).json({ success: false, error: "PART 1 分數不可低於 0" }); return;
      }
      if (delta === -2 && (counters.p1?.plus2 ?? 0) === 0) {
        res.status(400).json({ success: false, error: "PART 1 沒有 +2 可反向" }); return;
      }
      if (delta === -3 && (counters.p1?.plus3 ?? 0) === 0) {
        res.status(400).json({ success: false, error: "PART 1 沒有 +3 可反向" }); return;
      }
    } else if (partIndex === 2) {
      const part2Score = isRed ? match.redPart2Score : match.bluePart2Score;
      if (part2Score + delta < 0) {
        res.status(400).json({ success: false, error: "PART 2 分數不可低於 0" }); return;
      }
      if (delta === -2 && (counters.p2?.plus2 ?? 0) === 0) {
        res.status(400).json({ success: false, error: "PART 2 沒有 +2 可反向" }); return;
      }
      if (delta === -3 && (counters.p2?.plus3 ?? 0) === 0) {
        res.status(400).json({ success: false, error: "PART 2 沒有 +3 可反向" }); return;
      }
    } else if (partIndex === 3) {
      const part3Score = isRed ? match.redPart3Score : match.bluePart3Score;
      if (part3Score + delta < 0) {
        res.status(400).json({ success: false, error: "PART 3 分數不可低於 0" }); return;
      }
      if (delta === -2 && (counters.p3?.plus2 ?? 0) === 0) {
        res.status(400).json({ success: false, error: "PART 3 沒有 +2 可反向" }); return;
      }
      if (delta === -3 && (counters.p3?.plus3 ?? 0) === 0) {
        res.status(400).json({ success: false, error: "PART 3 沒有 +3 可反向" }); return;
      }
    } else {
      // ALL PARTS：檢查 WAZA-ARI 計數不可低於 0
      const wazaCurrent = isRed ? match.redWazaAri : match.blueWazaAri;
      if (wazaCurrent + delta < 0) {
        res.status(400).json({ success: false, error: "WAZA-ARI 計數不可低於 0" }); return;
      }
    }
  }

  // 更新 PART 分數（+2/+3 只影響 partScore 和 totalScore，不影響 WAZA-ARI 計數）
  if (partIndex === 1) {
    if (isRed) match.redPart1Score = Math.max(0, match.redPart1Score + delta);
    else match.bluePart1Score = Math.max(0, match.bluePart1Score + delta);
  } else if (partIndex === 2) {
    if (isRed) match.redPart2Score = Math.max(0, match.redPart2Score + delta);
    else match.bluePart2Score = Math.max(0, match.bluePart2Score + delta);
  } else if (partIndex === 3) {
    if (isRed) match.redPart3Score = Math.max(0, match.redPart3Score + delta);
    else match.bluePart3Score = Math.max(0, match.bluePart3Score + delta);
  }

  // ALL PARTS（+1/-1）才更新 WAZA-ARI 計數
  if (partIndex === null) {
    if (isRed) match.redWazaAri = Math.max(0, match.redWazaAri + delta);
    else match.blueWazaAri = Math.max(0, match.blueWazaAri + delta);
  }

  // 總計分：所有操作皆影響（PART +2/+3 或 ALL PARTS +1/-1）
  if (isRed) match.redTotalScore = Math.max(0, match.redTotalScore + delta);
  else match.blueTotalScore = Math.max(0, match.blueTotalScore + delta);

  // 更新 IPPON 計數（只有 PART 操作才影響，每次 +1）
  if (partIndex !== null) {
    const pKey = `p${partIndex}` as "p1" | "p2" | "p3";
    const rawIppons = match[ipponKey] as { p1?: number; p2?: number; p3?: number } | undefined;
    const ippons = { p1: rawIppons?.p1 ?? 0, p2: rawIppons?.p2 ?? 0, p3: rawIppons?.p3 ?? 0 };
    ippons[pKey] = Math.max(0, ippons[pKey] + (delta > 0 ? 1 : -1));
    match[ipponKey] = ippons;

    // 更新 PART plus 計數器（分開追蹤 +2/-2 和 +3/-3）
    const counterKey = `${side}PartCounters` as "redPartCounters" | "bluePartCounters";
    const rawCounters = (match[counterKey] as any) || { p1: { plus2: 0, plus3: 0 }, p2: { plus2: 0, plus3: 0 }, p3: { plus2: 0, plus3: 0 } };
    const counters = {
      p1: { plus2: rawCounters.p1?.plus2 ?? 0, plus3: rawCounters.p1?.plus3 ?? 0 },
      p2: { plus2: rawCounters.p2?.plus2 ?? 0, plus3: rawCounters.p2?.plus3 ?? 0 },
      p3: { plus2: rawCounters.p3?.plus2 ?? 0, plus3: rawCounters.p3?.plus3 ?? 0 }
    };
    if (delta === 2) {
      counters[pKey].plus2 = Math.max(0, counters[pKey].plus2 + 1);
    } else if (delta === -2) {
      counters[pKey].plus2 = Math.max(0, counters[pKey].plus2 - 1);
    } else if (delta === 3) {
      counters[pKey].plus3 = Math.max(0, counters[pKey].plus3 + 1);
    } else if (delta === -3) {
      counters[pKey].plus3 = Math.max(0, counters[pKey].plus3 - 1);
    }
    match[counterKey] = counters;
  }

  // 確認是否達成 FULL IPPON
  const rawIpponsCheck = match[ipponKey] as { p1?: number; p2?: number; p3?: number } | undefined;
  const fullIppon = (rawIpponsCheck?.p1 ?? 0) >= 1 && (rawIpponsCheck?.p2 ?? 0) >= 1 && (rawIpponsCheck?.p3 ?? 0) >= 1;
  let triggerFullIppon = false;

  if (fullIppon && !["full-ippon-pending", "shido-dq-pending", "completed"].includes(match.status)) {
    match.status = "full-ippon-pending";
    // FULL IPPON：總計分強制設為 50，對方總計分歸零
    if (isRed) { match.redTotalScore = 50; match.blueTotalScore = 0; match.blueWazaAri = 0; }
    else { match.blueTotalScore = 50; match.redTotalScore = 0; match.redWazaAri = 0; }
    triggerFullIppon = true;
  }

  await match.save();

  // 寫入 log
  const logEntry = await MatchScoreLog.create({
    matchId,
    side,
    type: partIndex !== null ? "part-score" : "all-parts-score",
    value: delta,
    partIndex: partIndex ?? null,
    ipponsSnapshot: { ...match[ipponKey] },
  });

  const eventId = match.eventId.toString();

  // 廣播即時分數
  broadcast.matchFoulUpdated(eventId, {
    matchId,
    redWazaAri: match.redWazaAri,
    blueWazaAri: match.blueWazaAri,
    redTotalScore: match.redTotalScore,
    blueTotalScore: match.blueTotalScore,
    redShido: match.redShido,
    blueShido: match.blueShido,
    redPart1Score: match.redPart1Score,
    redPart2Score: match.redPart2Score,
    redPart3Score: match.redPart3Score,
    bluePart1Score: match.bluePart1Score,
    bluePart2Score: match.bluePart2Score,
    bluePart3Score: match.bluePart3Score,
    redIppons: match.redIppons,
    blueIppons: match.blueIppons,
  });

  if (triggerFullIppon) {
    broadcast.matchFullIppon(eventId, {
      matchId,
      suggestedWinner: side,
    });
  }

  res.status(201).json({ success: true, data: logEntry });
}

// ─── 犯規（SHIDO / CHUI）────────────────────────────────────────────────────

/**
 * POST /api/v1/match-scores/foul
 * body: { matchId, side, foulType: 'shido'|'chui', delta: 1|-1 }
 */
export async function foulAction(req: Request, res: Response): Promise<void> {
  const { matchId, side, foulType, delta } = req.body as {
    matchId: string;
    side: "red" | "blue";
    foulType: "shido" | "chui";
    delta: 1 | -1;
  };

  if (!matchId || !side || !foulType || delta === undefined) {
    res.status(400).json({ success: false, error: "缺少必填欄位" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) { res.status(404).json({ success: false, error: "找不到場次" }); return; }
  if (isFinished(match.status)) {
    res.status(409).json({ success: false, error: "場次已結束" });
    return;
  }

  const shidoUnits = foulType === "chui" ? 3 : 1;
  const shidoKey = `${side}Shido` as "redShido" | "blueShido";
  const oppSide = side === "red" ? "blue" : "red";
  const oppWazaKey = `${oppSide}WazaAri` as "redWazaAri" | "blueWazaAri";

  // 防負數：減分時確保不低於 0
  if (delta < 0) {
    if (match[shidoKey] < shidoUnits) {
      res.status(400).json({
        success: false,
        error: `${foulType.toUpperCase()} 計次不足，無法減扣`,
      });
      return;
    }
    if (match[oppWazaKey] < shidoUnits) {
      res.status(400).json({
        success: false,
        error: "對手 WAZA-ARI 不足，無法回算",
      });
      return;
    }
  }

  // 更新 SHIDO 計次
  match[shidoKey] = Math.max(0, match[shidoKey] + shidoUnits * delta);

  // 更新對手 WAZA-ARI 及總計分（SHIDO 和 CHUI 都會）
  match[oppWazaKey] = Math.max(0, match[oppWazaKey] + shidoUnits * delta);
  const oppTotalKey = `${oppSide}TotalScore` as "redTotalScore" | "blueTotalScore";
  match[oppTotalKey] = Math.max(0, match[oppTotalKey] + shidoUnits * delta);

  // 檢查 SHIDO DQ
  let triggerShidoDq = false;
  if (match[shidoKey] >= 6 && !["full-ippon-pending", "shido-dq-pending", "completed"].includes(match.status)) {
    match.status = "shido-dq-pending";
    triggerShidoDq = true;
  }

  await match.save();

  // 寫入 log
  await MatchScoreLog.create({
    matchId,
    side,
    type: "foul",
    value: shidoUnits * delta,
    partIndex: null,
    ipponsSnapshot: { ...match[`${side}Ippons` as "redIppons" | "blueIppons"] },
  });

  const eventId = match.eventId.toString();

  broadcast.matchFoulUpdated(eventId, {
    matchId,
    redWazaAri: match.redWazaAri,
    blueWazaAri: match.blueWazaAri,
    redTotalScore: match.redTotalScore,
    blueTotalScore: match.blueTotalScore,
    redShido: match.redShido,
    blueShido: match.blueShido,
    chuiEvent: foulType === "chui" && delta > 0 ? side : null,
  });

  if (triggerShidoDq) {
    broadcast.matchShidoDq(eventId, {
      matchId,
      suggestedDisqualified: side,
      suggestedWinner: oppSide,
      shidoCount: match[shidoKey],
    });
  }

  res.json({ success: true, data: { shido: match[shidoKey], oppWazaAri: match[oppWazaKey] } });
}

// ─── 計時器設定 ──────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/match-scores/duration
 * body: { matchId, duration: number (seconds) }
 */
export async function setDuration(req: Request, res: Response): Promise<void> {
  const { matchId, duration } = req.body as { matchId: string; duration: number };

  if (!matchId || duration === undefined || duration <= 0) {
    res.status(400).json({ success: false, error: "無效的 duration" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) { res.status(404).json({ success: false, error: "找不到場次" }); return; }
  if (isFinished(match.status)) {
    res.status(409).json({ success: false, error: "場次已結束" });
    return;
  }

  match.matchDuration = duration;
  if (match.status === "pending") match.status = "in-progress";
  await match.save();

  res.json({ success: true, data: { matchDuration: match.matchDuration } });
}

// ─── 計時器微調 ──────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/match-scores/timer-adjust
 * body: { matchId, side, remainingBefore, remainingAfter }
 */
export async function timerAdjust(req: Request, res: Response): Promise<void> {
  const { matchId, remainingBefore, remainingAfter } = req.body as {
    matchId: string;
    remainingBefore: number;
    remainingAfter: number;
  };

  if (!matchId || remainingBefore === undefined || remainingAfter === undefined) {
    res.status(400).json({ success: false, error: "缺少必填欄位" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) { res.status(404).json({ success: false, error: "找不到場次" }); return; }
  if (!isPendingOrActive(match.status)) {
    res.status(409).json({ success: false, error: "場次狀態不允許調整計時" });
    return;
  }

  // 寫入 log（timer-adjust log）
  const log = await MatchScoreLog.create({
    matchId,
    side: "red", // timer adjust 不分邊，以 red 作占位
    type: "timer-adjust",
    value: remainingAfter - remainingBefore,
    partIndex: null,
    ipponsSnapshot: { p1: 0, p2: 0, p3: 0 },
    remainingBefore,
    remainingAfter,
  });

  const eventId = match.eventId.toString();
  broadcast.matchTimerAdjusted(eventId, { matchId, remainingBefore, remainingAfter });

  res.json({ success: true, data: log });
}

// ─── 既有功能（保留相容性）──────────────────────────────────────────────────

export async function createScoreLog(req: Request, res: Response): Promise<void> {
  const { matchId, side, type, value } = req.body;

  if (!matchId || !side || !type || value === undefined) {
    res.status(400).json({ success: false, error: "請填寫所有必填欄位" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) { res.status(404).json({ success: false, error: "找不到場次" }); return; }
  if (isFinished(match.status)) {
    res.status(409).json({ success: false, error: "場次已結束，不可新增得分記錄" });
    return;
  }

  const log = await MatchScoreLog.create({ matchId, side, type, value });
  res.status(201).json({ success: true, data: log });
}

export async function resetScoreLogs(req: Request, res: Response): Promise<void> {
  const { matchId } = req.body;
  if (!matchId) {
    res.status(400).json({ success: false, error: "請提供 matchId" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) { res.status(404).json({ success: false, error: "找不到場次" }); return; }
  if (isFinished(match.status)) {
    res.status(409).json({ success: false, error: "場次已結束，不可歸零" });
    return;
  }

  await MatchScoreLog.deleteMany({ matchId });

  // 重設 Match document 的所有對打計分欄位
  match.redPart1Score = 0;
  match.redPart2Score = 0;
  match.redPart3Score = 0;
  match.bluePart1Score = 0;
  match.bluePart2Score = 0;
  match.bluePart3Score = 0;
  match.redWazaAri = 0;
  match.blueWazaAri = 0;
  match.redTotalScore = 0;
  match.blueTotalScore = 0;
  match.redShido = 0;
  match.blueShido = 0;
  match.redIppons = { p1: 0, p2: 0, p3: 0 };
  match.blueIppons = { p1: 0, p2: 0, p3: 0 };
  match.redPartCounters = { p1: { plus2: 0, plus3: 0 }, p2: { plus2: 0, plus3: 0 }, p3: { plus2: 0, plus3: 0 } };
  match.bluePartCounters = { p1: { plus2: 0, plus3: 0 }, p2: { plus2: 0, plus3: 0 }, p3: { plus2: 0, plus3: 0 } };
  if (["full-ippon-pending", "shido-dq-pending"].includes(match.status)) {
    match.status = "in-progress";
  }
  await match.save();

  const eventId = match.eventId.toString();

  const zeros = {
    scores: { red: 0, blue: 0 },
    advantages: { red: 0, blue: 0 },
    warnings: { red: 0, blue: 0 },
  };
  broadcast.matchScoreUpdated(eventId, { matchId, ...zeros });
  broadcast.matchScoresReset(eventId, { matchId });
  // 廣播歸零的計分給觀眾端
  broadcast.matchFoulUpdated(eventId, {
    matchId,
    redWazaAri: 0, blueWazaAri: 0,
    redTotalScore: 0, blueTotalScore: 0,
    redShido: 0, blueShido: 0,
    redPart1Score: 0, redPart2Score: 0, redPart3Score: 0,
    bluePart1Score: 0, bluePart2Score: 0, bluePart3Score: 0,
    redIppons: { p1: 0, p2: 0, p3: 0 },
    blueIppons: { p1: 0, p2: 0, p3: 0 },
  });

  res.json({ success: true });
}

export async function getScoreSummary(req: Request, res: Response): Promise<void> {
  const matchId = req.query["matchId"] as string;
  if (!matchId) {
    res.status(400).json({ success: false, error: "請提供 matchId" });
    return;
  }

  const logs = await MatchScoreLog.find({ matchId }).sort({ timestamp: 1 }).lean();

  let rs = 0, bs = 0, ra = 0, ba = 0, rw = 0, bw = 0;
  for (const e of logs) {
    if (e.side === "red") {
      if (e.type === "score")     rs = Math.max(0, rs + e.value);
      if (e.type === "advantage") ra = Math.max(0, ra + e.value);
      if (e.type === "warning")   rw = Math.max(0, rw + e.value);
    } else {
      if (e.type === "score")     bs = Math.max(0, bs + e.value);
      if (e.type === "advantage") ba = Math.max(0, ba + e.value);
      if (e.type === "warning")   bw = Math.max(0, bw + e.value);
    }
  }

  res.json({
    success: true,
    data: {
      scores:     { red: rs, blue: bs },
      advantages: { red: ra, blue: ba },
      warnings:   { red: rw, blue: bw },
    },
  });
}

export async function getScoreLogs(req: Request, res: Response): Promise<void> {
  const matchId = req.query["matchId"] as string;
  if (!matchId) {
    res.status(400).json({ success: false, error: "請提供 matchId" });
    return;
  }

  const logs = await MatchScoreLog.find({ matchId }).sort({ timestamp: 1 }).lean();
  res.json({ success: true, data: logs });
}
