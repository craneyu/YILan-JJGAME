import { Router } from 'express';
import { login, register, registerInitial, selectEvent, listJudges, assignUserEvent, changePassword } from '../controllers/authController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', verifyToken, requireRole('admin'), register);
router.post('/register-initial', registerInitial);
// 裁判登入後選擇賽事（更新 eventId、回傳新 JWT）
router.post('/select-event', verifyToken, selectEvent);
// 管理員查詢所有裁判帳號及指派賽事
router.get('/users', verifyToken, requireRole('admin'), listJudges);
router.patch('/users/:userId/event', verifyToken, requireRole('admin'), assignUserEvent);
router.patch('/users/:userId/password', verifyToken, requireRole('admin'), changePassword);

export default router;
