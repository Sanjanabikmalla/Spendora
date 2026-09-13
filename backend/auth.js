// auth.js - Authentication & Token Management for PennyWise (Android + Web)
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pennywise_super_secret_jwt_key_hackathon_2026';
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'user_pennywise_01';
const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || 'demo@pennywise.ai';

/**
 * Generate a long-lived JWT token for a user
 */
function generateToken(userId = DEFAULT_USER_ID, email = DEFAULT_USER_EMAIL) {
  return jwt.sign(
    { userId, email, app: 'pennywise' },
    JWT_SECRET,
    { expiresIn: '365d' }
  );
}

/**
 * Authentication Middleware
 * Extracts userId from Authorization header: "Bearer <token>"
 * If no header is provided in demo mode, falls back gracefully to DEFAULT_USER_ID
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const queryToken = req.query.token;
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : queryToken;

  if (!token) {
    // In local dev/hackathon fallback to default user context
    req.user = {
      userId: DEFAULT_USER_ID,
      email: DEFAULT_USER_EMAIL,
      isDemo: true
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Fallback if token is invalid or expired
    req.user = {
      userId: DEFAULT_USER_ID,
      email: DEFAULT_USER_EMAIL,
      isDemo: true
    };
    next();
  }
}

module.exports = {
  generateToken,
  authenticateToken,
  DEFAULT_USER_ID,
  DEFAULT_USER_EMAIL
};
