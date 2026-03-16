import { Router } from "express";
import {
  getMatches,
  createMatch,
  bulkCreateMatches,
  updateMatch,
  deleteMatch,
  clearMatches,
} from "../controllers/matchController";
import { batchResetMatches } from "../controllers/batchResetMatchesController";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router({ mergeParams: true });

router.get("/:eventId/matches", getMatches);
router.post(
  "/:eventId/matches",
  verifyToken,
  requireRole("admin"),
  createMatch,
);
router.post(
  "/:eventId/matches/bulk",
  verifyToken,
  requireRole("admin"),
  bulkCreateMatches,
);
router.patch(
  "/:eventId/matches/batch-reset",
  verifyToken,
  requireRole("admin", "match_referee"),
  batchResetMatches,
);
router.patch(
  "/:eventId/matches/:matchId",
  verifyToken,
  requireRole("admin", "match_referee"),
  updateMatch,
);
router.delete(
  "/:eventId/matches/:matchId",
  verifyToken,
  requireRole("admin"),
  deleteMatch,
);
router.delete(
  "/:eventId/matches",
  verifyToken,
  requireRole("admin"),
  clearMatches,
);

export default router;
