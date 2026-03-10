import { Router } from "express";
import {
  createScoreLog,
  getScoreLogs,
  getScoreSummary,
  resetScoreLogs,
} from "../controllers/matchScoreController";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router();

router.post("/", verifyToken, requireRole("match_referee"), createScoreLog);
router.post("/reset", verifyToken, requireRole("match_referee"), resetScoreLogs);
router.get("/", verifyToken, requireRole("match_referee"), getScoreLogs);
router.get("/summary", getScoreSummary); // 公開端點，供觀眾端重載還原計分

export default router;
