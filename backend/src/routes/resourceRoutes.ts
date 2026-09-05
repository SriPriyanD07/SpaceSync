import { Router } from 'express';
import {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} from '../controllers/resourceController';
import { getResourceAvailability } from '../controllers/bookingController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Public / Member accessible routes
router.get('/', getAllResources);
router.get('/:id/availability', getResourceAvailability);
router.get('/:id', getResourceById);

// Admin-only management routes
router.post('/', authenticateToken, requireRole('admin'), createResource);
router.patch('/:id', authenticateToken, requireRole('admin'), updateResource);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteResource);

export default router;
