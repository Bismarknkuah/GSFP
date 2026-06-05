const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/systemController');

const only = (...roles) => (req,res,next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ error:`Access restricted to: ${roles.join(', ')}` });
  next();
};

// Super Admin initiates
router.post('/reset/initiate',    authenticate, only('super_admin'), c.initiateReset);
// List all requests — CEO, NatDir, SuperAdmin
router.get('/reset/requests',     authenticate, only('super_admin','ceo','national_director'), c.listRequests);
// CEO decides
router.post('/reset/:id/ceo',     authenticate, only('ceo'), c.ceoDecide);
// National Director decides
router.post('/reset/:id/natdir',  authenticate, only('national_director'), c.natdirDecide);
// Super Admin executes after dual approval
router.post('/reset/:id/execute', authenticate, only('super_admin'), c.executeReset);
// Reseed (super admin only)
router.post('/reseed',            authenticate, only('super_admin'), c.reseed);

module.exports = router;
