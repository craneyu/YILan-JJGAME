import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { openScoring, confirmScores, nextTeam, getCreativeState } from '../controllers/creativeFlowController';
import { startTimer, stopTimer } from '../controllers/creativeTimerController';

const router = Router();

router.post('/open-scoring', verifyToken, requireRole('sequence_judge', 'admin'), openScoring);
router.post('/confirm-scores', verifyToken, requireRole('sequence_judge', 'admin'), confirmScores);
router.post('/next-team', verifyToken, requireRole('sequence_judge', 'admin'), nextTeam);
router.post('/start-timer', verifyToken, requireRole('sequence_judge', 'admin'), startTimer);
router.post('/stop-timer', verifyToken, requireRole('sequence_judge', 'admin'), stopTimer);
router.get('/state/:eventId', verifyToken, requireRole('sequence_judge', 'admin', 'audience'), getCreativeState);

export default router;
