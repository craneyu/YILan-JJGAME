import { Router } from "express";
import { contactAction } from "../controllers/contactActionController";
import { contactWinner } from "../controllers/contactWinnerController";
import { contactCancelWinner } from "../controllers/contactCancelWinnerController";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router();

router.patch("/action", verifyToken, requireRole("match_referee", "admin"), contactAction);
router.patch("/winner", verifyToken, requireRole("match_referee", "admin"), contactWinner);
router.patch("/cancel-winner", verifyToken, requireRole("match_referee", "admin"), contactCancelWinner);

export default router;
