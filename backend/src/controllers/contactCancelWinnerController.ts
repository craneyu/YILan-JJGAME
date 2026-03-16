import { Request, Response } from "express";
import Match from "../models/Match";
import { broadcast } from "../sockets/index";

/**
 * PATCH /api/v1/contact/cancel-winner
 * body: { matchId }
 * 取消勝負宣告，將場次狀態恢復為 in-progress
 */
export async function contactCancelWinner(req: Request, res: Response): Promise<void> {
  const { matchId } = req.body as { matchId: string };

  if (!matchId) {
    res.status(400).json({ success: false, error: "缺少 matchId" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) {
    res.status(404).json({ success: false, error: "找不到場次" });
    return;
  }
  if (match.status !== "completed") {
    res.status(409).json({ success: false, error: "場次尚未完成，無需取消" });
    return;
  }

  match.status = "in-progress";
  match.result = undefined as any;
  await match.save();

  const eventId = match.eventId.toString();
  broadcast.contactCancelWinner(eventId, { matchId });

  res.json({ success: true });
}
