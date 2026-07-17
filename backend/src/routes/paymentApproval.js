const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/paymentApprovalController');

const only = (...roles) => (req,res,next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ error:`Access restricted` });
  next();
};

router.post('/:id/district-approve', authenticate, only('finance_officer','district_director'), c.districtApprove);
router.post('/:id/regional-approve', authenticate, only('regional_finance','regional_coordinator'), c.regionalApprove);
router.post('/:id/national-approve', authenticate, only('national_finance','national_admin','ceo'), c.nationalApprove);
router.post('/:id/reject',           authenticate, c.reject);
router.post('/remind',               authenticate, only('monitoring_officer','regional_monitoring','national_monitoring'), c.sendReminder);
module.exports = router;
