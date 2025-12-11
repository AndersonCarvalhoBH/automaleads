import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success:false, error:{ code:'INVALID_PAYLOAD', message:'email and password required' } });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success:false, error:{ code:'USER_NOT_FOUND', message:'Invalid credentials' } });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success:false, error:{ code:'INVALID_CREDENTIALS', message:'Invalid credentials' } });
    const secret = process.env.JWT_SECRET || 'change_me';
    const token = jwt.sign({ userId: user.id, accountId: user.accountId, roles: [user.role] }, secret, { expiresIn: '1h' });
    return res.json({ success:true, data:{ accessToken: token } });
  }
}
