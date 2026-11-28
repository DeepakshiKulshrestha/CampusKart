import { Router } from 'express';
import {
  createTransaction,
  payTransaction,
  cancelTransaction,
  getTransactions,
  getTransactionById,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

// Mounted at /api/transactions
const router = Router();

router.use(protect);
router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/:id/pay', payTransaction);
router.put('/:id/cancel', cancelTransaction);

export default router;
