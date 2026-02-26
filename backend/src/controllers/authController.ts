import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Event from '../models/Event';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: '請填寫帳號與密碼' });
    return;
  }

  const user = await User.findOne({ username });
  if (!user) {
    res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'default_secret';
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    judgeNo: user.judgeNo,
    eventId: user.eventId?.toString(),
  };
  const token = jwt.sign(payload, secret);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        judgeNo: user.judgeNo,
        eventId: user.eventId,
      },
    },
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { username, password, role, judgeNo, eventId } = req.body;
  if (!username || !password || !role) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
  }

  const exists = await User.findOne({ username });
  if (exists) {
    res.status(409).json({ success: false, error: '帳號已存在' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash, role, judgeNo, eventId });

  res.status(201).json({
    success: true,
    data: { id: user._id, username: user.username, role: user.role },
  });
}

export async function registerInitial(req: Request, res: Response): Promise<void> {
  const count = await User.countDocuments();
  if (count > 0) {
    res.status(403).json({ success: false, error: '資料庫已有使用者，無法使用初始化路徑' });
    return;
  }
  return register(req, res);
}

// 管理員：變更任意使用者密碼
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    res.status(400).json({ success: false, error: '密碼長度至少 4 個字元' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const user = await User.findByIdAndUpdate(
    userId,
    { passwordHash },
    { new: true, select: '-passwordHash' }
  );

  if (!user) {
    res.status(404).json({ success: false, error: '使用者不存在' });
    return;
  }

  res.json({ success: true });
}

// 管理員：列出所有裁判帳號（含 eventId）
export async function listJudges(_req: Request, res: Response): Promise<void> {
  const users = await User.find(
    { role: { $ne: 'audience' } },
    { passwordHash: 0 }
  ).populate('eventId', 'name').sort({ role: 1, judgeNo: 1 });
  res.json({ success: true, data: users });
}

// 管理員：指派裁判到指定賽事
export async function assignUserEvent(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const { eventId } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { eventId: eventId || null },
    { new: true, select: '-passwordHash' }
  ).populate('eventId', 'name');

  if (!user) {
    res.status(404).json({ success: false, error: '使用者不存在' });
    return;
  }
  res.json({ success: true, data: user });
}

// 裁判選擇賽事：更新 user.eventId 並回傳新 JWT
export async function selectEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  const userId = req.user!.userId;

  if (!eventId) {
    res.status(400).json({ success: false, error: '請選擇賽事' });
    return;
  }

  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }

  const user = await User.findByIdAndUpdate(userId, { eventId }, { new: true });
  if (!user) {
    res.status(404).json({ success: false, error: '使用者不存在' });
    return;
  }

  const secret = process.env.JWT_SECRET || 'default_secret';
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    judgeNo: user.judgeNo,
    eventId: user.eventId?.toString(),
  };
  const token = jwt.sign(payload, secret);

  res.json({ success: true, data: { token, eventId: user.eventId?.toString(), eventName: event.name } });
}
