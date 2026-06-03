const Notification = require('../models/Notification');
const { n } = require('../utils/normalize');
exports.list = async (req, res) => {
  const notifs = await Notification.find({ user_id:req.user._id }).sort({created_at:-1}).limit(50).lean();
  res.json({ notifications: notifs.map(n), unread: notifs.filter(n=>!n.read).length });
};
exports.markRead = async (req, res) => {
  await Notification.updateMany({ user_id:req.user._id, read:false }, { read:true });
  res.json({ ok:true });
};
