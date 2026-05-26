import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', authController.logout);

export default router;
