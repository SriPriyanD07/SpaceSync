import { Router } from 'express';
import {
  register,
  login,
  getMe,
  setupMfa,
  enableMfa,
  disableMfa,
  verifyMfa,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public Authentication Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/mfa/verify', verifyMfa);

// Authenticated User Endpoints
router.get('/me', authenticateToken, getMe);
router.post('/mfa/setup', authenticateToken, setupMfa);
router.post('/mfa/enable', authenticateToken, enableMfa);
router.post('/mfa/disable', authenticateToken, disableMfa);

export default router;
