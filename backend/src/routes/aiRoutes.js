import { Router } from 'express';
import { pricePrediction, priceFairness, suspicionScore } from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

// Mounted at /api/ai
const router = Router();

router.post('/price-prediction', protect, pricePrediction);
router.post('/price-fairness', priceFairness);
router.post('/suspicion-score', protect, authorize('ADMIN'), suspicionScore);

export default router;
