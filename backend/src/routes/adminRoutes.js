import { Router } from 'express';
import {
  getCommission,
  updateCommission,
  getAdminTransactions,
  getDashboard,
  analyticsHandler,
  getModelMetrics,
  listUsers,
  restrictUser,
  listProducts,
  removeProduct,
} from '../controllers/adminController.js';
import { listReports, reviewReport } from '../controllers/reportController.js';
import { listAiFlags, reviewAiFlag } from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

// Mounted at /api/admin. Every route below requires a logged-in ADMIN.
const router = Router();

router.use(protect, authorize('ADMIN'));

router.get('/dashboard', getDashboard);
router.get('/analytics/summary', analyticsHandler('summary'));
router.get('/analytics/sales-over-time', analyticsHandler('sales-over-time'));
router.get('/analytics/transactions-by-status', analyticsHandler('transactions-by-status'));
router.get('/analytics/top-categories', analyticsHandler('top-categories'));
router.get('/analytics/ai', analyticsHandler('ai'));
router.get('/model-metrics', getModelMetrics);

router.get('/commission', getCommission);
router.put('/commission', updateCommission);
router.get('/transactions', getAdminTransactions);

router.get('/reports', listReports);
router.put('/reports/:id', reviewReport);

router.get('/users', listUsers);
router.put('/users/:id/restrict', restrictUser);

router.get('/products', listProducts);
router.put('/products/:id/remove', removeProduct);

router.get('/ai-flags', listAiFlags);
router.put('/ai-flags/:id/review', reviewAiFlag);

export default router;
