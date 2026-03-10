import { Request, Response } from "express";
import MatchScoreLog from "../models/MatchScoreLog";
import Match from "../models/Match";
import { broadcast } from "../sockets/index";


export async function createScoreLog(
  req: Request,
  res: Response,
): Promise<void> {
  const { matchId, side, type, value } = req.body;

  if (!matchId || !side || !type || value === undefined) {
    res.status(400).json({ success: false, error: "請填寫所有必填欄位" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) {
    res.status(404).json({ success: false, error: "找不到場次" });
    return;
  }
  if (match.status === "completed") {
    res
      .status(409)
      .json({ success: false, error: "場次已結束，不可新增得分記錄" });
    return;
  }

  const log = await MatchScoreLog.create({ matchId, side, type, value });

  // 廣播由前端 socket emit 負責，後端只負責持久化
  res.status(201).json({ success: true, data: log });
}

export async function resetScoreLogs(
  req: Request,
  res: Response,
): Promise<void> {
  const { matchId } = req.body;
  if (!matchId) {
    res.status(400).json({ success: false, error: "請提供 matchId" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) {
    res.status(404).json({ success: false, error: "找不到場次" });
    return;
  }
  if (match.status === "completed") {
    res.status(409).json({ success: false, error: "場次已結束，不可歸零" });
    return;
  }

  await MatchScoreLog.deleteMany({ matchId });

  const zeros = {
    scores: { red: 0, blue: 0 },
    advantages: { red: 0, blue: 0 },
    warnings: { red: 0, blue: 0 },
  };
  broadcast.matchScoreUpdated(match.eventId.toString(), { matchId, ...zeros });
  broadcast.matchScoresReset(match.eventId.toString(), { matchId });

  res.json({ success: true });
}

export async function getScoreLogs(req: Request, res: Response): Promise<void> {
  const matchId = req.query["matchId"] as string;
  if (!matchId) {
    res.status(400).json({ success: false, error: "請提供 matchId" });
    return;
  }

  const logs = await MatchScoreLog.find({ matchId })
    .sort({ timestamp: 1 })
    .lean();
  res.json({ success: true, data: logs });
}
