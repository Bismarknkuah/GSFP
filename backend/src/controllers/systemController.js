const ResetRequest = require('../models/ResetRequest');
const AuditLog     = require('../models/AuditLog');
const { newId, nowISO } = require('../utils/ids');
const { seed } = require('../db/seed');

const SCOPE_LABELS = {
  reports:'Reports Only', payments:'Payments Only',
  reports_payments:'Reports & Payments', all:'Full System Reset',
};

// ── Super Admin: initiate reset request ──────────────────────────
exports.initiateReset = async (req, res) => {
  const { scope, reason } = req.body;
  if (!scope || !reason) return res.status(400).json({ error:'scope and reason are required' });

  // Cancel any existing pending requests
  await ResetRequest.updateMany(
    { status:{ $in:['pending_ceo','pending_natdir','dual_approved'] } },
    { $set:{ status:'rejected', reject_reason:'Superseded by new request', rejected_at:new Date() } }
  );

  const expires = new Date(); expires.setHours(expires.getHours()+48);
  const request = await ResetRequest.create({
    _id: newId('rst'),
    scope, scope_label: SCOPE_LABELS[scope]||scope,
    requested_by: req.user._id||req.user.id,
    requested_by_name: req.user.name,
    reason, status:'pending_ceo',
    expires_at: expires,
    created_at: new Date(),
  });

  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role, action:'RESET_REQUEST_INITIATED',
    target:'system', details:`Reset request: ${SCOPE_LABELS[scope]} — ${reason}`, level:'warning' });

  res.status(201).json({ request });
};

// ── List reset requests (for CEO/NatDir dashboard) ───────────────
exports.listRequests = async (req, res) => {
  const requests = await ResetRequest.find().sort({ created_at:-1 }).limit(20);
  res.json({ requests });
};

// ── CEO approves/rejects ──────────────────────────────────────────
exports.ceoDecide = async (req, res) => {
  const { action, comment } = req.body;
  const request = await ResetRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error:'Request not found' });
  if (request.status !== 'pending_ceo') return res.status(400).json({ error:`Cannot action — status is ${request.status}` });

  if (action === 'reject') {
    request.status = 'rejected';
    request.rejected_by = req.user._id||req.user.id;
    request.rejected_by_name = req.user.name;
    request.rejected_at = new Date();
    request.reject_reason = comment||'Rejected by CEO';
  } else {
    request.ceo_id = req.user._id||req.user.id;
    request.ceo_name = req.user.name;
    request.ceo_approved = true;
    request.ceo_comment = comment;
    request.ceo_decided_at = new Date();
    request.status = 'pending_natdir';
  }
  await request.save();
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role,
    action:`RESET_REQUEST_CEO_${action.toUpperCase()}`,
    target:'system', details:`CEO ${action}: ${request.scope_label} — ${comment||''}`, level:'warning' });
  res.json({ request });
};

// ── National Director approves/rejects ───────────────────────────
exports.natdirDecide = async (req, res) => {
  const { action, comment } = req.body;
  const request = await ResetRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error:'Request not found' });
  if (request.status !== 'pending_natdir') return res.status(400).json({ error:`Cannot action — status is ${request.status}` });

  if (action === 'reject') {
    request.status = 'rejected';
    request.rejected_by = req.user._id||req.user.id;
    request.rejected_by_name = req.user.name;
    request.rejected_at = new Date();
    request.reject_reason = comment||'Rejected by National Director';
  } else {
    request.natdir_id = req.user._id||req.user.id;
    request.natdir_name = req.user.name;
    request.natdir_approved = true;
    request.natdir_comment = comment;
    request.natdir_decided_at = new Date();
    request.status = 'dual_approved';
  }
  await request.save();
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role,
    action:`RESET_REQUEST_NATDIR_${action.toUpperCase()}`,
    target:'system', details:`NatDir ${action}: ${request.scope_label} — ${comment||''}`, level:'warning' });
  res.json({ request });
};

// ── Super Admin executes (only after dual_approved) ──────────────
exports.executeReset = async (req, res) => {
  const { confirmText } = req.body;
  if (confirmText !== 'RESET CONFIRMED') return res.status(400).json({ error:'Confirmation phrase incorrect' });

  const request = await ResetRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error:'Request not found' });
  if (request.status !== 'dual_approved') return res.status(400).json({ error:'Both CEO and National Director must approve first' });
  if (request.expires_at && new Date() > request.expires_at) return res.status(400).json({ error:'Request has expired — please initiate a new one' });

  const deleted = {};
  const { scope } = request;

  if (['reports','reports_payments','all'].includes(scope)) {
    const Report = require('../models/Report');
    deleted.reports = (await Report.deleteMany({})).deletedCount;
  }
  if (['payments','reports_payments','all'].includes(scope)) {
    const Payment = require('../models/Payment');
    deleted.payments = (await Payment.deleteMany({})).deletedCount;
  }
  if (scope === 'all') {
    const [User,School,District,Region,Budget,Disbursement,Message,EnrollmentRequest] = [
      require('../models/User'), require('../models/School'), require('../models/District'),
      require('../models/Region'), require('../models/Budget'), require('../models/Disbursement'),
      require('../models/Message'), require('../models/EnrollmentRequest'),
    ];
    const results = await Promise.all([
      User.deleteMany({}), School.deleteMany({}), District.deleteMany({}),
      Region.deleteMany({}), Budget.deleteMany({}), Disbursement.deleteMany({}),
      Message.deleteMany({}), EnrollmentRequest.deleteMany({}),
    ]);
    ['users','schools','districts','regions','budgets','disbursements','messages','enrollment'].forEach((k,i)=>deleted[k]=results[i].deletedCount);
  }

  request.status = 'executed';
  request.executed_by = req.user._id||req.user.id;
  request.executed_at = new Date();
  request.deleted_counts = deleted;
  await request.save();

  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role, action:'SYSTEM_RESET_EXECUTED',
    target:'system', details:`EXECUTED by ${req.user.name}: ${request.scope_label} — ${JSON.stringify(deleted)}`, level:'critical' });

  res.json({ ok:true, scope, deleted });
};

// ── Reseed ────────────────────────────────────────────────────────
exports.reseed = async (req, res) => {
  await seed({ force:true });
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role, action:'SYSTEM_RESEED',
    target:'system', details:`Reseeded by ${req.user.name}`, level:'warning' });
  res.json({ ok:true, summary:'16 regions, 5 districts, 8 schools, 34 users, reports, payments, FAQs, disbursements' });
};
