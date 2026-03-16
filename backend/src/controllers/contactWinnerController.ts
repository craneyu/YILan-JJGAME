import { Request, Response } from "express";
import Match from "../models/Match";
import { broadcast } from "../sockets/index";

type Side = "red" | "blue";
type ContactMethod = "submission" | "knockdown" | "foul-dq" | "effective-attack" | "decision";

/**
 * PATCH /api/v1/contact-winner
 * body: { matchId, winner: 'red'|'blue', method: 'submission'|'knockdown'|'foul-dq' }
 */
export async function contactWinner(req: Request, res: Response): Promise<void> {
  const { matchId, winner, method } = req.body as {
    matchId: string;
    winner: Side;
    method: ContactMethod;
  };

  if (!matchId || !winner || !method) {
    res.status(400).json({ success: false, error: "缺少必填欄位" });
    return;
  }
  if (!["red", "blue"].includes(winner)) {
    res.status(400).json({ success: false, error: "winner 須為 red 或 blue" });
    return;
  }
  if (!["submission", "knockdown", "foul-dq", "effective-attack", "decision"].includes(method)) {
    res.status(400).json({ success: false, error: "無效的 method" });
    return;
  }

  const match = await Match.findById(matchId);
  if (!match) {
    res.status(404).json({ success: false, error: "找不到場次" });
    return;
  }
  if (match.status === "completed") {
    res.status(409).json({ success: false, error: "場次已結束" });
    return;
  }

  // Map contact method to MatchMethod enum
  const matchMethod = method === "foul-dq" ? "dq" : method;

  match.status = "completed";
  match.result = { winner, method: matchMethod as any };
  await match.save();

  const eventId = match.eventId.toString();
  broadcast.contactWinner(eventId, { matchId, winner, method });

  res.json({ success: true, data: { winner, method } });
}
