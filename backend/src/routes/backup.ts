import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { downloadBackup } from '../controllers/backupController';

const router = Router();

router.get('/', verifyToken, requireRole('admin'), downloadBackup);

export default router;
