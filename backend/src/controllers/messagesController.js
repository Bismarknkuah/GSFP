const Message = require('../models/Message');
const User    = require('../models/User');
const { audit } = require('../utils/audit');
const { n }     = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');

// All broadcast scopes a role can see
const INBOX_SCOPES = {
  super_admin:          ['BROADCAST_ALL','BROADCAST_NATIONAL','BROADCAST_REGIONAL','BROADCAST_DFC','BROADCAST_RFC','BROADCAST_CATERERS','BROADCAST_HEADMASTERS'],
  national_admin:       ['BROADCAST_ALL','BROADCAST_NATIONAL','BROADCAST_REGIONAL','BROADCAST_DFC','BROADCAST_RFC','BROADCAST_CATERERS','BROADCAST_HEADMASTERS'],
  national_finance:     ['BROADCAST_ALL','BROADCAST_NATIONAL'],
  regional_minister:    ['BROADCAST_ALL','BROADCAST_REGIONAL','BROADCAST_RFC'],
  regional_coordinator: ['BROADCAST_ALL','BROADCAST_REGIONAL','BROADCAST_RFC','BROADCAST_DFC'],
  regional_admin:       ['BROADCAST_ALL','BROADCAST_REGIONAL','BROADCAST_RFC'],
  regional_finance:     ['BROADCAST_ALL','BROADCAST_REGIONAL'],
  regional_auditor:     ['BROADCAST_ALL','BROADCAST_REGIONAL'],
  district_director:    ['BROADCAST_ALL','BROADCAST_REGIONAL','BROADCAST_DFC','BROADCAST_CATERERS','BROADCAST_HEADMASTERS'],
  district_coordinator: ['BROADCAST_ALL','BROADCAST_REGIONAL','BROADCAST_DFC','BROADCAST_CATERERS','BROADCAST_HEADMASTERS'],
  district_admin:       ['BROADCAST_ALL','BROADCAST_DFC'],
  finance_officer:      ['BROADCAST_ALL','BROADCAST_DFC'],
  auditor:              ['BROADCAST_ALL'],
  monitoring_officer:   ['BROADCAST_ALL'],
  caterer:              ['BROADCAST_ALL','BROADCAST_CATERERS'],
  headmaster:           ['BROADCAST_ALL','BROADCAST_HEADMASTERS'],
  data_entry:           ['BROADCAST_ALL'],
  readonly:             ['BROADCAST_ALL'],
};

async function expandMsg(m, uid) {
  const sender = await User.findOne({ _id: m.sender_id }).select('_id name role title').lean();
  return n({ ...m, sender, read: (m.read_by || []).includes(uid) });
}

exports.list = async (req, res) => {
  const uid    = req.user._id;
  const scopes = INBOX_SCOPES[req.user.role] || ['BROADCAST_ALL'];
  // Also include region-specific and district-specific broadcasts
  if (req.user.region_id)   scopes.push(`BROADCAST_REGION_${req.user.region_id}`);
  if (req.user.district_id) scopes.push(`BROADCAST_DISTRICT_${req.user.district_id}`);
  const [inbox, sent] = await Promise.all([
    Message.find({ recipient: { $in: [uid, ...scopes] } }).sort({ timestamp: -1 }).limit(200).lean(),
    Message.find({ sender_id: uid }).sort({ timestamp: -1 }).limit(100).lean(),
  ]);
  const [inboxEx, sentEx] = await Promise.all([
    Promise.all(inbox.map(m => expandMsg(m, uid))),
    Promise.all(sent.map(m => expandMsg(m, uid))),
  ]);
  res.json({ inbox: inboxEx, sent: sentEx });
};

exports.send = async (req, res) => {
  const { recipient, subject, body, priority, recipientRole, recipientRegion, recipientDistrict } = req.body || {};
  if (!body) return res.status(400).json({ error: 'Message body required' });
  // Build recipient string
  let finalRecipient = recipient;
  if (!finalRecipient && recipientRole) {
    // Convert role to broadcast scope
    const roleMap = { caterer:'BROADCAST_CATERERS', headmaster:'BROADCAST_HEADMASTERS', district_coordinator:'BROADCAST_DFC', regional_coordinator:'BROADCAST_RFC' };
    finalRecipient = roleMap[recipientRole] || `BROADCAST_ROLE_${recipientRole}`;
  }
  if (!finalRecipient) return res.status(400).json({ error: 'recipient required' });
  const isBroadcast = finalRecipient.startsWith('BROADCAST_');
  if (!isBroadcast) {
    const target = await User.findOne({ _id: finalRecipient, active: true }).lean();
    if (!target) return res.status(404).json({ error: 'Recipient not found' });
  }
  const id = newId('msg');
  await Message.create({ _id: id, sender_id: req.user._id, recipient: finalRecipient, type: isBroadcast ? 'broadcast' : 'direct', level: 'national', subject: subject || null, body, priority: priority || 'normal', timestamp: nowISO(), read_by: [] });
  await audit({ user: req.user, action: 'MESSAGE_SENT', target: finalRecipient, details: subject || '(no subject)' });
  const msg = await Message.findOne({ _id: id }).lean();
  res.status(201).json({ message: await expandMsg(msg, req.user._id) });
};

exports.markRead = async (req, res) => {
  await Message.updateOne({ _id: req.params.id }, { $addToSet: { read_by: req.user._id } });
  res.json({ ok: true });
};

exports.markAllRead = async (req, res) => {
  const uid    = req.user._id;
  const scopes = INBOX_SCOPES[req.user.role] || ['BROADCAST_ALL'];
  if (req.user.region_id)   scopes.push(`BROADCAST_REGION_${req.user.region_id}`);
  if (req.user.district_id) scopes.push(`BROADCAST_DISTRICT_${req.user.district_id}`);
  await Message.updateMany({ recipient: { $in: [uid, ...scopes] } }, { $addToSet: { read_by: uid } });
  res.json({ ok: true });
};

exports.getUsers = async (req, res) => {
  const { role, regionId, districtId, q } = req.query;
  const filter = { active: true };
  if (role)       filter.role       = role;
  if (regionId)   filter.region_id  = regionId;
  if (districtId) filter.district_id = districtId;
  if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } }];
  // Scope enforcement
  if (req.user.region_id)   filter.region_id  = req.user.region_id;
  if (req.user.district_id) filter.district_id = req.user.district_id;
  const users = await User.find(filter).select('_id name role username district_id region_id').sort({ name: 1 }).lean();
  res.json({ users: users.map(n) });
};
