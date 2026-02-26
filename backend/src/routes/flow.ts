import { Router } from 'express';
import { openAction, nextGroup, getGameState, setAbstain, cancelAbstain } from '../controllers/flowController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/open-action', verifyToken, requireRole('sequence_judge', 'admin'), openAction);
router.post('/next-group', verifyToken, requireRole('sequence_judge', 'admin'), nextGroup);
router.post('/abstain', verifyToken, requireRole('sequence_judge', 'admin'), setAbstain);
router.post('/cancel-abstain', verifyToken, requireRole('sequence_judge', 'admin'), cancelAbstain);
router.get('/state/:eventId', verifyToken, requireRole('sequence_judge', 'admin'), getGameState);

export default router;
