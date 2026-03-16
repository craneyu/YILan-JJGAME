import { Router } from "express";
import { contactAction } from "../controllers/contactActionController";
import { contactWinner } from "../controllers/contactWinnerController";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router();

router.patch("/action", verifyToken, requireRole("match_referee", "admin"), contactAction);
router.patch("/winner", verifyToken, requireRole("match_referee", "admin"), contactWinner);

export default router;
