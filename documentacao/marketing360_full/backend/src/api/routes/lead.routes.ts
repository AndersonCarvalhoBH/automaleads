import { Router } from 'express';
import { LeadController } from '../../controllers/lead.controller';

const router = Router();

router.post('/', LeadController.create);
router.get('/', LeadController.list);

export default router;
