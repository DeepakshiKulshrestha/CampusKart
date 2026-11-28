import { Router } from 'express';
import { getInterests, updateInterest } from '../controllers/interestController.js';
import { protect } from '../middleware/auth.js';

// Mounted at /api/interests. Creating an interest lives in productRoutes (POST /api/products/:id/interest).
const router = Router();

router.get('/', protect, getInterests);
router.put('/:id', protect, updateInterest);

export default router;
