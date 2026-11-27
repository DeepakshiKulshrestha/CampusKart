import { Router } from 'express';
import { createReport } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

// Mounted at /api/reports. Admin review lives under /api/admin/reports.
const router = Router();

router.post('/', protect, createReport);

export default router;
