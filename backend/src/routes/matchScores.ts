import { Router } from "express";
import {
  createScoreLog,
  getScoreLogs,
  getScoreSummary,
  resetScoreLogs,
  resetMatchScoresBulk,
  partScore,
  foulAction,
  setDuration,
  timerAdjust,
} from "../controllers/matchScoreController";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router();

// 既有端點（ne-waza 相容）
router.post("/", verifyToken, requireRole("match_referee"), createScoreLog);
router.post("/reset", verifyToken, requireRole("match_referee"), resetScoreLogs);
router.get("/", verifyToken, requireRole("match_referee"), getScoreLogs);
router.get("/summary", getScoreSummary);

// 批次重置成績（admin only）
router.post("/reset-bulk", verifyToken, requireRole("admin"), resetMatchScoresBulk);

// 新端點（fighting v6）
router.post("/part", verifyToken, requireRole("match_referee", "admin"), partScore);
router.post("/foul", verifyToken, requireRole("match_referee", "admin"), foulAction);
router.patch("/duration", verifyToken, requireRole("match_referee", "admin"), setDuration);
router.patch("/timer-adjust", verifyToken, requireRole("match_referee", "admin"), timerAdjust);

export default router;
