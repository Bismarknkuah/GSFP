const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/enrollmentController');
router.get('/',           authenticate, c.list);
router.post('/',          authenticate, c.submit);
router.post('/:id/review',authenticate, c.review);
module.exports = router;
