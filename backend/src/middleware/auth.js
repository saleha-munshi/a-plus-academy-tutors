const { auth } = require('../config/firebase');

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches decoded token (with custom claims) to req.user.
 */
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);

  if (!match) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const decoded = await auth.verifyIdToken(match[1]);
    req.user = decoded; // contains uid, email, role (custom claim)
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restricts access to specific roles.
 * Usage: requireRole('owner') or requireRole('owner', 'tutor')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
