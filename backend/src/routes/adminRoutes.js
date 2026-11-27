import { Router } from 'express';
import { getCommission, updateCommission, getAdminTransactions } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

// Mounted at /api/admin. Every route below requires a logged-in ADMIN.
const router = Router();

router.use(protect, authorize('ADMIN'));

router.get('/commission', getCommission);
router.put('/commission', updateCommission);
router.get('/transactions', getAdminTransactions);

export default router;
