import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { submitCreativeScore, getCreativeScores } from '../controllers/creativeScoreController';

const router = Router();

router.post('/', verifyToken, requireRole('scoring_judge', 'admin'), submitCreativeScore);
router.get('/', verifyToken, requireRole('scoring_judge', 'sequence_judge', 'admin', 'audience'), getCreativeScores);

export default router;
