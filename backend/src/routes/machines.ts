import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import * as controller from '../controllers/machineController';

const router = Router();

router.get('/', authMiddleware, asyncHandler(controller.list));
router.get('/:id', authMiddleware, asyncHandler(controller.getById));
router.post('/', authMiddleware, roleGuard('SUPERVISOR'), asyncHandler(controller.create));
router.patch('/:id', authMiddleware, roleGuard('SUPERVISOR'), asyncHandler(controller.update));
router.delete('/:id', authMiddleware, roleGuard('SUPERVISOR'), asyncHandler(controller.remove));

export default router;
