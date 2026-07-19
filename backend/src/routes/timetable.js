const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/timetableController');

const dfcOnly = (req,res,next) => {
  if (!['district_coordinator','coordinator','district_director'].includes(req.user?.role))
    return res.status(403).json({ error:'Only District Feeding Coordinator can post timetables' });
  next();
};

router.get('/',     authenticate, c.get);
router.get('/all',  authenticate, c.list);
router.post('/',    authenticate, dfcOnly, c.upsert);
module.exports = router;
