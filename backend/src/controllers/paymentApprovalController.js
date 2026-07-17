const Payment  = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const { newId, nowISO } = require('../utils/ids');

// District Finance Officer — approve days cooked and submit to region
exports.districtApprove = async (req, res) => {
  const { days_approved, comment } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error:'Payment not found' });

  const school = await require('../models/School').findById(payment.school_id);
  const enrolled = school?.enrolled || 0;
  const rate     = payment.rate_per_student || 2.00;
  const days     = Number(days_approved) || payment.days_paid;

  payment.district_finance_approved    = true;
  payment.district_finance_approved_by = String(req.user._id||req.user.id);
  payment.district_finance_approved_at = new Date();
  payment.district_finance_days        = days;
  payment.district_finance_comment     = comment||'';
  payment.days_paid                    = days;
  payment.days_arrears                 = payment.days_covered - days;
  payment.amount_paid                  = days * enrolled * rate;
  payment.arrears_amount               = payment.days_arrears * enrolled * rate;
  payment.status                       = 'pending_regional';

  await payment.save();
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:String(req.user._id||req.user.id),
    user_name:req.user.name, user_role:req.user.role, action:'PAYMENT_DISTRICT_APPROVED',
    target:payment._id, details:`District approved ${days} days for payment ${payment._id}. ${comment||''}`, level:'info' });
  res.json({ payment });
};

// Regional Finance — approve and forward to national
exports.regionalApprove = async (req, res) => {
  const { comment } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error:'Payment not found' });
  if (!payment.district_finance_approved) return res.status(400).json({ error:'District Finance must approve first' });

  payment.regional_finance_approved    = true;
  payment.regional_finance_approved_by = String(req.user._id||req.user.id);
  payment.regional_finance_approved_at = new Date();
  payment.regional_finance_comment     = comment||'';
  payment.status                       = 'pending_national';

  await payment.save();
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:String(req.user._id||req.user.id),
    user_name:req.user.name, user_role:req.user.role, action:'PAYMENT_REGIONAL_APPROVED',
    target:payment._id, details:`Regional approved payment ${payment._id}. ${comment||''}`, level:'info' });
  res.json({ payment });
};

// National Finance — final approval, visible to caterer
exports.nationalApprove = async (req, res) => {
  const { comment } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error:'Payment not found' });
  if (!payment.regional_finance_approved) return res.status(400).json({ error:'Regional Finance must approve first' });

  payment.national_finance_approved    = true;
  payment.national_finance_approved_by = String(req.user._id||req.user.id);
  payment.national_finance_approved_at = new Date();
  payment.national_finance_comment     = comment||'';
  payment.status                       = payment.days_arrears > 0 ? 'partial' : 'fully-paid';
  payment.visible_to_caterer           = true;  // Now shows on caterer dashboard

  await payment.save();
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:String(req.user._id||req.user.id),
    user_name:req.user.name, user_role:req.user.role, action:'PAYMENT_NATIONAL_APPROVED',
    target:payment._id, details:`National final approval for payment ${payment._id}. ${comment||''}`, level:'info' });
  res.json({ payment });
};

// Reject at any level
exports.reject = async (req, res) => {
  const { comment } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error:'Payment not found' });

  payment.status = 'partial';
  payment.district_finance_approved = false;
  payment.regional_finance_approved = false;
  payment.national_finance_approved = false;

  await payment.save();
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:String(req.user._id||req.user.id),
    user_name:req.user.name, user_role:req.user.role, action:'PAYMENT_REJECTED',
    target:payment._id, details:`Payment rejected by ${req.user.name}. ${comment||''}`, level:'warning' });
  res.json({ payment });
};

// Send reminder (monitoring officer)
exports.sendReminder = async (req, res) => {
  const { caterer_id, message } = req.body;
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:String(req.user._id||req.user.id),
    user_name:req.user.name, user_role:req.user.role, action:'REMINDER_SENT',
    target:caterer_id||'all', details:`Reminder sent by ${req.user.name}: ${message||'Please submit your daily feeding report'}`, level:'info' });
  res.json({ ok:true, message:'Reminder sent successfully' });
};
