const router  = require('express').Router();
const multer  = require('multer');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/bulkUploadController');

const upload = multer({ storage: multer.memoryStorage(), limits:{ fileSize:10*1024*1024 } });

router.get( '/template',         c.downloadTemplate);
router.post('/payments',  authenticate, upload.single('file'), c.uploadPayments);
router.post('/reports',   authenticate, upload.single('file'), c.uploadReports);
router.post('/schools',   authenticate, upload.single('file'), c.uploadSchools);
router.post('/users',     authenticate, upload.single('file'), c.uploadUsers);
module.exports = router;
