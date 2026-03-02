import { Router } from 'express';
import { toggleWrongAttack, getWrongAttacks } from '../controllers/wrongAttackController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', verifyToken, requireRole('vr_judge'), toggleWrongAttack);
router.get('/', verifyToken, getWrongAttacks);

export default router;
