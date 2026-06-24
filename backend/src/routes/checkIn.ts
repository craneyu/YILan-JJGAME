import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth";
import {
  listParticipants,
  setWeighIn,
  setCheckIn,
} from "../controllers/checkInController";

const router = Router({ mergeParams: true });

router.get(
  "/",
  verifyToken,
  requireRole("check_in_officer", "admin"),
  listParticipants,
);

router.patch(
  "/:teamId/:memberIndex/weigh-in",
  verifyToken,
  requireRole("check_in_officer", "admin"),
  setWeighIn,
);

router.patch(
  "/:teamId/:memberIndex/check-in",
  verifyToken,
  requireRole("check_in_officer", "admin"),
  setCheckIn,
);

export default router;
