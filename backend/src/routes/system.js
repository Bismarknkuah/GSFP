const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/systemController');

// Super admin only middleware
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ error:'Super Admin access required' });
  next();
};

router.post('/reset',  authenticate, superAdminOnly, c.reset);
router.post('/reseed', authenticate, superAdminOnly, c.reseed);

module.exports = router;
