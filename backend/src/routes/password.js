const express = require('express');
const ctrl    = require('../controllers/passwordController');
const { authenticate, requireRole } = require('../middleware/auth');
const router  = express.Router();
router.post('/forgot',       ctrl.forgotCheck);
router.post('/change',       authenticate, ctrl.change);
router.post('/admin-reset/:userId',    authenticate, requireRole('super_admin','national_admin','regional_coordinator','regional_admin','district_director','district_coordinator'), ctrl.adminReset);
router.post('/generate-temp/:userId',  authenticate, requireRole('super_admin','national_admin','regional_coordinator','regional_admin','district_director','district_coordinator'), ctrl.generateTemp);
module.exports = router;
