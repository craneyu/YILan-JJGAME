import { Router } from 'express';
import { submitVRScore } from '../controllers/vrScoreController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', verifyToken, requireRole('vr_judge'), submitVRScore);

export default router;
