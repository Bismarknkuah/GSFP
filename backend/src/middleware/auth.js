const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { can } = require('../utils/permissions');

const SECRET = () => process.env.JWT_SECRET || 'gsfp-secret-2024';

function signToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, SECRET(), { expiresIn: '12h' });
}

async function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(h.slice(7), SECRET());
    const user = await User.findOne({ _id: payload.sub, active: true }).lean();
    if (!user) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
  };
}

function requirePerm(perm) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (can(req.user.role, perm)) return next();
    return res.status(403).json({ error: `Permission denied: ${perm}` });
  };
}

// Scope middleware — ensures user can only access their own region/district
function scopeCheck(req, res, next) {
  const u = req.user;
  // National roles see everything
  if (['super_admin','national_admin','national_finance'].includes(u.role)) return next();
  // Regional roles: attach region filter
  if (u.region_id) req.scopeRegion = u.region_id;
  // District roles: attach both filters
  if (u.district_id) req.scopeDistrict = u.district_id;
  // School roles: attach school filter
  if (u.school_id) req.scopeSchool = u.school_id;
  next();
}

module.exports = { signToken, authenticate, requireRole, requirePerm, scopeCheck };
