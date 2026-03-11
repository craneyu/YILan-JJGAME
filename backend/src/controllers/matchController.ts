import { Request, Response } from "express";
import Match, { MatchStatus } from "../models/Match";

const VALID_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  pending: ["in-progress"],
  "in-progress": ["full-ippon-pending", "shido-dq-pending", "completed"],
  "full-ippon-pending": ["completed"],
  "shido-dq-pending": ["completed"],
  completed: [],
};

export async function getMatches(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId;
  const filter: Record<string, unknown> = { eventId };
  if (req.query["matchType"]) filter["matchType"] = req.query["matchType"];

  const matches = await Match.find(filter).sort({ scheduledOrder: 1 }).lean();
  res.json({ success: true, data: matches });
}

export async function createMatch(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId;
  const {
    matchType,
    category,
    weightClass,
    round,
    matchNo,
    redPlayer,
    bluePlayer,
    isBye,
    scheduledOrder,
  } = req.body;

  if (
    !matchType ||
    !category ||
    !weightClass ||
    !round ||
    !matchNo ||
    !redPlayer ||
    !bluePlayer ||
    scheduledOrder === undefined
  ) {
    res.status(400).json({ success: false, error: "請填寫所有必填欄位" });
    return;
  }

  const match = await Match.create({
    eventId,
    matchType,
    category,
    weightClass,
    round,
    matchNo,
    redPlayer,
    bluePlayer,
    isBye: isBye ?? false,
    scheduledOrder,
  });
  res.status(201).json({ success: true, data: match });
}

export async function bulkCreateMatches(
  req: Request,
  res: Response,
): Promise<void> {
  const eventId = req.params.eventId;
  const rows: Array<Record<string, unknown>> = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, error: "請提供賽程資料陣列" });
    return;
  }

  // 取得本批次的 matchType（允許每筆各自帶，取第一筆為主）
  const batchMatchType = rows[0]?.["matchType"] as string | undefined;

  // 檢查 scheduledOrder 重複（僅限同 matchType）
  const incomingOrders = rows.map((r) => Number(r["scheduledOrder"]));
  const duplicatesInPayload = incomingOrders.filter(
    (o, i) => incomingOrders.indexOf(o) !== i,
  );
  if (duplicatesInPayload.length > 0) {
    res.status(409).json({
      success: false,
      error: `輸入資料中 scheduledOrder 重複：${[...new Set(duplicatesInPayload)].join(", ")}`,
    });
    return;
  }

  const existingFilter: Record<string, unknown> = {
    eventId,
    scheduledOrder: { $in: incomingOrders },
  };
  if (batchMatchType) existingFilter["matchType"] = batchMatchType;

  const existing = await Match.find(existingFilter).lean();
  if (existing.length > 0) {
    const conflicted = existing.map((m) => m.scheduledOrder);
    res.status(409).json({
      success: false,
      error: `以下場次序號已存在：${conflicted.join(", ")}`,
    });
    return;
  }

  const docs = rows.map((r) => ({ ...r, eventId }));
  const created = await Match.insertMany(docs);
  res.status(201).json({ success: true, count: created.length, data: created });
}

export async function updateMatch(req: Request, res: Response): Promise<void> {
  const matchId = req.params.matchId;
  const match = await Match.findById(matchId);

  if (!match) {
    res.status(404).json({ success: false, error: "找不到場次" });
    return;
  }

  const { status, result, ...otherFields } = req.body;

  // 狀態機：裁判端只能依合法轉移更新狀態
  if (status !== undefined) {
    const user = (req as Request & { user?: { role: string } }).user;
    if (!user) {
      res.status(401).json({ success: false, error: "未授權" });
      return;
    }

    if (match.status === "completed" && user.role !== "admin") {
      res.status(409).json({ success: false, error: "已完成場次不得修改狀態" });
      return;
    }

    const allowed = VALID_TRANSITIONS[match.status];
    if (!allowed.includes(status as MatchStatus)) {
      res.status(409).json({
        success: false,
        error: `不允許從 ${match.status} 轉移至 ${status}`,
      });
      return;
    }
    match.status = status as MatchStatus;
  }

  if (result !== undefined) match.result = result;

  // admin 可自由更新其他欄位
  const adminEditableFields = [
    "category",
    "weightClass",
    "round",
    "matchNo",
    "redPlayer",
    "bluePlayer",
    "isBye",
    "scheduledOrder",
    "matchType",
  ];
  const userRole = (req as Request & { user?: { role: string } }).user?.role;
  if (userRole === "admin") {
    for (const key of adminEditableFields) {
      if (otherFields[key] !== undefined) {
        (match as unknown as Record<string, unknown>)[key] = otherFields[key];
      }
    }
  }

  await match.save();
  res.json({ success: true, data: match });
}

export async function deleteMatch(req: Request, res: Response): Promise<void> {
  const matchId = req.params.matchId as string;
  const deleted = await Match.findByIdAndDelete(matchId);
  if (!deleted) {
    res.status(404).json({ success: false, error: "找不到場次" });
    return;
  }
  res.json({ success: true });
}

export async function clearMatches(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId as string;
  const filter: Record<string, unknown> = { eventId };
  if (req.query["matchType"]) filter["matchType"] = req.query["matchType"];
  const result = await Match.deleteMany(filter);
  res.json({ success: true, deleted: result.deletedCount });
}
