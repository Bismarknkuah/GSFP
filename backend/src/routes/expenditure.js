const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/expenditureController');
router.get('/',          authenticate, c.list);
router.get('/guidance',  authenticate, c.guidance);
router.post('/',         authenticate, c.add);
router.delete('/:id',    authenticate, c.remove);
module.exports = router;
