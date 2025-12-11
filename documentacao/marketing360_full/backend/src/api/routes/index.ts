import { Router } from 'express';
import authRoutes from './auth.routes';
import leadRoutes from './lead.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);

export default router;
