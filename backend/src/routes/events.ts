import { Router } from 'express';
import {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventSummary,
  getEventRankings,
} from '../controllers/eventController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', listEvents);
router.post('/', verifyToken, requireRole('admin'), createEvent);
router.get('/:id', getEvent);
router.get('/:id/summary', getEventSummary);
router.get('/:id/rankings', getEventRankings);
router.patch('/:id', verifyToken, requireRole('admin'), updateEvent);
router.delete('/:id', verifyToken, requireRole('admin'), deleteEvent);

export default router;
