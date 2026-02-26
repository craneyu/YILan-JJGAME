import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('[Error]', err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || '伺服器內部錯誤',
  });
}
