import { Router } from 'express';
import { submitScore, getEventScores, getMyScore, getMyRoundScores } from '../controllers/scoreController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', verifyToken, requireRole('scoring_judge', 'admin'), submitScore);
router.get('/mine', verifyToken, requireRole('scoring_judge', 'admin'), getMyScore);
router.get('/my-round', verifyToken, requireRole('scoring_judge', 'admin'), getMyRoundScores);
router.get('/events/:id/scores', getEventScores);

export default router;
