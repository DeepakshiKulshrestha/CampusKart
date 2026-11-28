import { Router } from 'express';
import { pricePrediction, priceFairness } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

// Mounted at /api/ai
const router = Router();

router.post('/price-prediction', protect, pricePrediction);
router.post('/price-fairness', priceFairness);

export default router;
