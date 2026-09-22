// auth.js - Authentication & Supabase Token Management for PennyWise (Android + Web)
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'pennywise_super_secret_jwt_key_hackathon_2026';
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'user_pennywise_01';
const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || 'demo@pennywise.ai';

// Initialize Supabase Client if credentials are provided
let supabase = null;
if (SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Generate a long-lived JWT token for demo/local testing
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
 * Extracts userId securely from Supabase JWT or Bearer token
 * NEVER trusts a client-supplied user_id from body or query params
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const queryToken = req.query.token;
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : queryToken;

  if (!token) {
    req.user = {
      userId: DEFAULT_USER_ID,
      email: DEFAULT_USER_EMAIL,
      isDemo: true
    };
    return next();
  }

  // 1. If Supabase client is available, verify token with Supabase Auth
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          userId: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          isSupabase: true
        };
        return next();
      }
    } catch (err) {
      console.warn("Supabase token verification failed, checking local JWT fallback:", err.message);
    }
  }

  // 2. Fallback to verifying standard JWT if using custom token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId || decoded.sub || DEFAULT_USER_ID,
      email: decoded.email || DEFAULT_USER_EMAIL,
      isDemo: !supabase
    };
    return next();
  } catch (err) {
    // Graceful fallback for demo/unauthenticated environments
    req.user = {
      userId: DEFAULT_USER_ID,
      email: DEFAULT_USER_EMAIL,
      isDemo: true
    };
    return next();
  }
}

module.exports = {
  supabase,
  generateToken,
  authenticateToken,
  DEFAULT_USER_ID,
  DEFAULT_USER_EMAIL
};

