import { Router } from "express";
import {
  createScoreLog,
  getScoreLogs,
  resetScoreLogs,
} from "../controllers/matchScoreController";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router();

router.post("/", verifyToken, requireRole("match_referee"), createScoreLog);
router.post("/reset", verifyToken, requireRole("match_referee"), resetScoreLogs);
router.get("/", verifyToken, requireRole("match_referee"), getScoreLogs);

export default router;
