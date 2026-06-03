const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (_r,_f,cb) => cb(null, UPLOAD_DIR),
  filename:    (_r, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: (Number(process.env.MAX_UPLOAD_SIZE_MB)||5)*1024*1024 },
  fileFilter: (_r, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) });
module.exports = { upload };
