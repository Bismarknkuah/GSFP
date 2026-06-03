const AuditLog = require('../models/AuditLog');
const { newId, nowISO } = require('./ids');
async function audit({ user, action, target, details='', level='info' }) {
  try {
    await AuditLog.create({
      _id: newId('aud'), timestamp: nowISO(), user_id: user?._id||'system',
      user_name: user?.name||'System', user_role: user?.role||'system',
      action, target: target||'', details, level,
    });
  } catch(e) { /* non-blocking */ }
}
module.exports = { audit };
