const AuditLog = require('../models/AuditLog');
const { n } = require('../utils/normalize');
exports.list = async (req, res) => {
  const { action, userId, from, to, level } = req.query;
  const filter = {};
  if (action) filter.action  = { $regex:action, $options:'i' };
  if (userId) filter.user_id = userId;
  if (level)  filter.level   = level;
  if (from||to) { filter.timestamp={}; if(from)filter.timestamp.$gte=from; if(to)filter.timestamp.$lte=to+'T23:59:59Z'; }
  const entries = await AuditLog.find(filter).sort({timestamp:-1}).limit(Math.min(Number(req.query.limit)||500,2000)).lean();
  res.json({ entries: entries.map(n) });
};
