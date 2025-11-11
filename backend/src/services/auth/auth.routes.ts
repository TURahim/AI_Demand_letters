import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rate-limiter';

const router = Router();

/**
 * Public routes
 */

// Register new user
router.post('/register', rateLimiter('auth'), authController.register);

// Login
router.post('/login', rateLimiter('auth'), authController.login);

// Refresh token
router.post('/refresh', rateLimiter('auth'), authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

/**
 * Protected routes (require authentication)
 */

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

export default router;

