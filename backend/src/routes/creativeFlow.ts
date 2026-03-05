import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { openScoring, confirmScores, nextTeam, getCreativeState, abstainTeam, cancelAbstain } from '../controllers/creativeFlowController';
import { startTimer, stopTimer, pauseTimer, resumeTimer, resetTimer } from '../controllers/creativeTimerController';

const router = Router();

router.post('/open-scoring', verifyToken, requireRole('sequence_judge', 'admin'), openScoring);
router.post('/confirm-scores', verifyToken, requireRole('sequence_judge', 'admin'), confirmScores);
router.post('/next-team', verifyToken, requireRole('sequence_judge', 'admin'), nextTeam);
router.post('/start-timer', verifyToken, requireRole('sequence_judge', 'admin'), startTimer);
router.post('/stop-timer', verifyToken, requireRole('sequence_judge', 'admin'), stopTimer);
router.post('/pause-timer', verifyToken, requireRole('sequence_judge', 'admin'), pauseTimer);
router.post('/resume-timer', verifyToken, requireRole('sequence_judge', 'admin'), resumeTimer);
router.post('/reset-timer', verifyToken, requireRole('sequence_judge', 'admin'), resetTimer);
router.post('/abstain', verifyToken, requireRole('sequence_judge', 'admin'), abstainTeam);
router.post('/abstain-cancel', verifyToken, requireRole('sequence_judge', 'admin'), cancelAbstain);
router.get('/state/:eventId', verifyToken, requireRole('sequence_judge', 'scoring_judge', 'admin', 'audience'), getCreativeState);

export default router;
