import User from '../models/User.model.js';
import { verifyToken } from '../utils/jwt.js';

// Requires "Authorization: Bearer <token>". Loads the user from MongoDB and attaches it to req.user.
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Not authenticated: missing token' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Not authenticated: invalid or expired token' });
  }

  try {
    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated: user no longer exists' });
    }
    if (user.isRestricted) {
      return res.status(403).json({ success: false, message: 'Your account has been restricted' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Role guard. Must run after protect, e.g. router.get('/x', protect, authorize('ADMIN'), handler)
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

export { protect, authorize };
