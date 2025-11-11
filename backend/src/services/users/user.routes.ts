import { Router } from 'express';
import * as userController from './user.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { checkUserAccess, enforceFirmIsolation } from '../../middleware/firm-isolation';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * User routes
 */

// Get all users in firm (admin/partner only)
router.get('/', authorize('ADMIN', 'PARTNER'), userController.getUsers);

// Get user by ID
router.get(
  '/:id',
  checkUserAccess,
  enforceFirmIsolation('user'),
  userController.getUser
);

// Update user
router.put(
  '/:id',
  checkUserAccess,
  enforceFirmIsolation('user'),
  userController.updateUser
);

// Change password
router.post(
  '/:id/change-password',
  checkUserAccess,
  userController.changePassword
);

// Deactivate user (admin only)
router.delete(
  '/:id',
  authorize('ADMIN'),
  enforceFirmIsolation('user'),
  userController.deactivateUser
);

export default router;

