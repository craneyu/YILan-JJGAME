import { Router } from 'express';
import {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  importTeams,
  batchDeleteTeams,
  batchUpdateOrder,
  upload,
} from '../controllers/teamController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/', listTeams);
router.post('/', verifyToken, requireRole('admin'), createTeam);
router.post('/import', verifyToken, requireRole('admin'), upload.single('file'), importTeams);
router.post('/batch-delete', verifyToken, requireRole('admin'), batchDeleteTeams);
router.post('/batch-order', verifyToken, requireRole('admin'), batchUpdateOrder);
router.patch('/:teamId', verifyToken, requireRole('admin'), updateTeam);
router.delete('/:teamId', verifyToken, requireRole('admin'), deleteTeam);

export default router;
