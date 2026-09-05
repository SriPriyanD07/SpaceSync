import { Router } from 'express';
import { getStatistics, getUtilization } from '../controllers/adminController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Protect all admin routes with authentication and admin role enforcement
router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/statistics', getStatistics);
router.get('/utilization', getUtilization);

export default router;
