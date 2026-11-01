import bcrypt from 'bcrypt';
import User from '../models/User.model.js';
import { generateToken } from '../utils/jwt.js';
import { registerSchema, loginSchema, updateMeSchema, validationError } from '../utils/validation.js';

const SALT_ROUNDS = 10;
// Compared against when the email is unknown, so login takes the same time either way
const DUMMY_HASH = bcrypt.hashSync('campuskart-dummy-password', SALT_ROUNDS);

// POST /api/auth/register
async function register(req, res, next) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const { name, email, password, role } = parsed.data;

  // Public signup must not be able to create admins, otherwise anyone could make themselves one
  if (role === 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin accounts cannot be created via registration' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role });
    const token = generateToken(user._id, user.role);
    return res.status(201).json({ success: true, token, user }); // toJSON strips passwordHash
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const { email, password } = parsed.data;

  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    // Same message for unknown email and wrong password, so emails can't be enumerated
    if (!user || !ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.isRestricted) {
      return res.status(403).json({ success: false, message: 'Your account has been restricted' });
    }

    const token = generateToken(user._id, user.role);
    return res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
// JWTs are stateless: the server keeps no session, so there is nothing to clear on its side.
// The client logs out by discarding its token. (Revoking a token before it expires would need
// a server-side denylist, which this project doesn't have.)
function logout(req, res) {
  return res.json({ success: true, message: 'Logged out. Discard the token on the client.' });
}

// GET /api/users/me (protected)
function getMe(req, res) {
  return res.json({ success: true, user: req.user });
}

// PUT /api/users/me (protected) — name and profileImage only
async function updateMe(req, res, next) {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    req.user.set(parsed.data);
    await req.user.save();
    return res.json({ success: true, user: req.user });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

export { register, login, logout, getMe, updateMe };
