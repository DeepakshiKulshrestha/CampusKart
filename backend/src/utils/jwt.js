import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';

function getSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return process.env.JWT_SECRET;
}

// Signs a token carrying the user id and role. Expiry comes from JWT_EXPIRES_IN (default 7 days).
function generateToken(userId, role) {
  return jwt.sign({ id: String(userId), role }, getSecret(), {
    algorithm: ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Returns the decoded payload { id, role, iat, exp }. Throws if the token is invalid or expired.
function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });
}

export { generateToken, verifyToken };
