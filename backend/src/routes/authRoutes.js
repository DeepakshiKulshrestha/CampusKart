import { Router } from 'express';
import { register, login, logout, getMe, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

// Mounted at /api/auth
const authRouter = Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);

// Mounted at /api/users
const userRouter = Router();
userRouter.get('/me', protect, getMe);
userRouter.put('/me', protect, updateMe);

export { authRouter, userRouter };
