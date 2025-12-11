import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  context?: { userId?: string, accountId?: string, roles?: string[] };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ success:false, error:{ code:'NO_AUTH', message:'Missing Authorization header' } });
  const token = String(auth).replace(/^Bearer\s+/i, '');
  try {
    const secret = process.env.JWT_SECRET || 'change_me';
    const payload = jwt.verify(token, secret) as any;
    req.context = { userId: payload.userId, accountId: payload.accountId, roles: payload.roles || [] };
    next();
  } catch (err) {
    return res.status(401).json({ success:false, error:{ code:'INVALID_TOKEN', message:'Invalid token' } });
  }
}
