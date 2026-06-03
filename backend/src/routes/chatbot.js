const express = require('express');
const ctrl    = require('../controllers/chatbotController');
const { authenticate, requireRole } = require('../middleware/auth');
const router  = express.Router();

const ADMIN_ROLES = [
  'ceo','national_director','super_admin','national_admin',
  'regional_coordinator','regional_admin','district_director','district_coordinator'
];

router.use(authenticate);
// All users can chat
router.post('/chat',               ctrl.chat);
router.get('/session/:id',         ctrl.getSession);
// FAQ - all users can read
router.get('/faq',                 ctrl.listFAQ);
// Admin-only: manage FAQ and answer questions
router.post('/faq',                requireRole(...ADMIN_ROLES), ctrl.createFAQ);
router.patch('/faq/:id',           requireRole(...ADMIN_ROLES), ctrl.updateFAQ);
router.delete('/faq/:id',          requireRole(...ADMIN_ROLES), ctrl.deleteFAQ);
router.get('/pending',             requireRole(...ADMIN_ROLES), ctrl.listPending);
router.post('/pending/:id/answer', requireRole(...ADMIN_ROLES), ctrl.answerQuestion);
router.post('/pending/:id/dismiss',requireRole(...ADMIN_ROLES), ctrl.dismissQuestion);
router.get('/stats',               requireRole(...ADMIN_ROLES), ctrl.stats);
module.exports = router;
