import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  markSold,
} from '../controllers/productController.js';
import { createInterest } from '../controllers/interestController.js';
import { createReport } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { uploadProductImages, handleUploadErrors } from '../middleware/upload.js';

// Mounted at /api/products
const router = Router();

// protect runs before multer so unauthenticated requests never get their files buffered
router.post('/', protect, uploadProductImages, handleUploadErrors, createProduct);
router.get('/', getProducts);
router.get('/mine', protect, getMyProducts); // must stay above /:id or "mine" is treated as an id
router.get('/:id', getProductById);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.put('/:id/sold', protect, markSold);
router.post('/:id/interest', protect, createInterest);
router.post('/:id/report', protect, createReport); // same as POST /api/reports with productId in the URL

export default router;
