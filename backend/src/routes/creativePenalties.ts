import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { updatePenalties, getPenalties } from '../controllers/creativePenaltyController';

const router = Router();

router.post('/', verifyToken, requireRole('sequence_judge', 'admin'), updatePenalties);
router.get('/', verifyToken, requireRole('sequence_judge', 'admin', 'audience'), getPenalties);

export default router;
