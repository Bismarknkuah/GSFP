const express = require('express');
const ctrl    = require('../controllers/auditController');
const { authenticate, requireRole } = require('../middleware/auth');
const router  = express.Router();
router.use(authenticate, requireRole(
  'ceo','national_director','super_admin','national_admin',
  'regional_coordinator','regional_auditor','district_director','auditor'
));
router.get('/', ctrl.list);
module.exports = router;
