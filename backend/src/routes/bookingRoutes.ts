import { Router } from 'express';
import {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
} from '../controllers/bookingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

export default router;
