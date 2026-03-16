import { Request, Response } from "express";
import Match from "../models/Match";
import { broadcast } from "../sockets/index";

type Side = "red" | "blue";
type ActionType = "foul" | "knockdown" | "goldenMinute";

/**
 * PATCH /api/v1/contact-action
 * body: { matchId, action: 'foul'|'knockdown'|'goldenMinute', side?: 'red'|'blue', delta?: 1|-1 }
 */
export async function contactAction(req: Request, res: Response): Promise<void> {
  const { matchId, action, side, delta } = req.body as {
    matchId: string;
    action: ActionType;
    side?: Side;
    delta?: 1 | -1;
  };

  if (!matchId || !action) {
    res.status(400).json({ success: false, error: "缺少必填欄位" });
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

  const eventId = match.eventId.toString();

  if (action === "foul") {
    if (!side || delta === undefined) {
      res.status(400).json({ success: false, error: "foul 需要 side 和 delta" });
      return;
    }
    const raw = match.foulCount as { red?: number; blue?: number } | undefined;
    const current = { red: raw?.red ?? 0, blue: raw?.blue ?? 0 };

    if (delta < 0 && current[side] <= 0) {
      res.status(400).json({ success: false, error: "犯規計數已為 0，不可繼續減少" });
      return;
    }

    current[side] = Math.max(0, current[side] + delta);
    match.foulCount = current;
    await match.save();

    broadcast.contactFoulUpdated(eventId, { matchId, side, foulCount: current });
    res.json({ success: true, data: { foulCount: current } });
    return;
  }

  if (action === "knockdown") {
    if (!side || delta === undefined) {
      res.status(400).json({ success: false, error: "knockdown 需要 side 和 delta" });
      return;
    }
    const raw = match.knockdownCount as { red?: number; blue?: number } | undefined;
    const current = { red: raw?.red ?? 0, blue: raw?.blue ?? 0 };

    if (delta < 0 && current[side] <= 0) {
      res.status(400).json({ success: false, error: "擊倒計數已為 0，不可繼續減少" });
      return;
    }

    current[side] = Math.max(0, current[side] + delta);
    match.knockdownCount = current;
    await match.save();

    broadcast.contactKnockdownUpdated(eventId, { matchId, side, knockdownCount: current });
    res.json({ success: true, data: { knockdownCount: current } });
    return;
  }

  if (action === "goldenMinute") {
    const current = match.goldenMinuteCount ?? 0;
    if (current >= 2) {
      res.status(400).json({ success: false, error: "黃金分鐘最多 2 次" });
      return;
    }
    match.goldenMinuteCount = current + 1;
    await match.save();

    broadcast.contactGoldenMinute(eventId, {
      matchId,
      goldenMinuteCount: match.goldenMinuteCount,
    });
    res.json({ success: true, data: { goldenMinuteCount: match.goldenMinuteCount } });
    return;
  }

  res.status(400).json({ success: false, error: "無效的 action" });
}
