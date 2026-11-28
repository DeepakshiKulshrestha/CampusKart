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

// For public routes that behave the same for everyone but want to know who is asking (e.g. search logs).
// A valid token sets req.user; a missing or bad token is simply ignored.
async function optionalAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const user = await User.findById(verifyToken(token).id);
      if (user && !user.isRestricted) req.user = user;
    } catch {
      // ignore: the route is public
    }
  }
  next();
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

export { protect, optionalAuth, authorize };
