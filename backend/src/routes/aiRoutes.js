import { Router } from 'express';
import { pricePrediction, priceFairness, suspicionScore, semanticSearch } from '../controllers/aiController.js';
import { protect, optionalAuth, authorize } from '../middleware/auth.js';

// Mounted at /api/ai
const router = Router();

router.post('/price-prediction', protect, pricePrediction);
router.post('/price-fairness', priceFairness);
router.post('/semantic-search', optionalAuth, semanticSearch); // public; a token only adds userId to the search log
router.post('/suspicion-score', protect, authorize('ADMIN'), suspicionScore);

export default router;
