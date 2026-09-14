import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  judgeNo?: number;
  eventId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未提供驗證 token' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const secret = process.env.JWT_SECRET || 'default_secret';
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token 無效或已過期' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '請先登入' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '權限不足' });
      return;
    }
    next();
  };
}

/**
 * 選擇性驗證：有帶合法 token 就填入 req.user，沒帶或 token 無效一律視為匿名放行。
 * 用於公開端點但需依角色決定回傳欄位的情境（例如排名 API 的裁判評分明細）。
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const secret = process.env.JWT_SECRET || 'default_secret';
    req.user = jwt.verify(authHeader.slice(7), secret) as JwtPayload;
  } catch {
    // token 無效視為匿名，不回 401
  }
  next();
}
