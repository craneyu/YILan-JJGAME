import { Request, Response } from "express";
import Match from "../models/Match";

/**
 * PATCH /api/v1/events/:eventId/matches/batch-reset
 * body: { matchIds: string[] }
 * 批次清空指定場次的所有成績，恢復為待開始狀態
 */
export async function batchResetMatches(req: Request, res: Response): Promise<void> {
  const { eventId } = req.params as { eventId: string };
  const { matchIds } = req.body as { matchIds: string[] };

  if (!Array.isArray(matchIds) || matchIds.length === 0) {
    res.status(400).json({ success: false, error: "matchIds 不可為空" });
    return;
  }

  await Match.updateMany(
    { _id: { $in: matchIds }, eventId },
    {
      $set: {
        status: "pending",
        // contact fields
        foulCount: { red: 0, blue: 0 },
        knockdownCount: { red: 0, blue: 0 },
        goldenMinuteCount: 0,
        // fighting fields
        redPart1Score: 0,
        redPart2Score: 0,
        redPart3Score: 0,
        bluePart1Score: 0,
        bluePart2Score: 0,
        bluePart3Score: 0,
        redIppons: { p1: 0, p2: 0, p3: 0 },
        blueIppons: { p1: 0, p2: 0, p3: 0 },
        "redPartCounters.p1": { plus2: 0, plus3: 0 },
        "redPartCounters.p2": { plus2: 0, plus3: 0 },
        "redPartCounters.p3": { plus2: 0, plus3: 0 },
        "bluePartCounters.p1": { plus2: 0, plus3: 0 },
        "bluePartCounters.p2": { plus2: 0, plus3: 0 },
        "bluePartCounters.p3": { plus2: 0, plus3: 0 },
        redWazaAri: 0,
        blueWazaAri: 0,
        redTotalScore: 0,
        blueTotalScore: 0,
        redShido: 0,
        blueShido: 0,
        redChuiCount: 0,
        blueChuiCount: 0,
        matchDuration: 180,
      },
      $unset: { result: "" },
    },
  );

  res.json({ success: true, resetCount: matchIds.length });
}
