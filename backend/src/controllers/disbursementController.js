const Disbursement = require('../models/Disbursement');
const Budget       = require('../models/Budget');
const Payment      = require('../models/Payment');
const User         = require('../models/User');
const Region       = require('../models/Region');
const District     = require('../models/District');
const { audit }    = require('../utils/audit');
const { n }        = require('../utils/normalize');
const { newId, nowISO, todayISO } = require('../utils/ids');

const CEO_ROLES = ['ceo','national_director','super_admin'];

// ── List disbursements ────────────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { status, year, regionId, districtId, limit } = req.query;
    const filter = {};
    if (status)     filter.status      = status;
    if (year)       filter.fiscal_year = year;
    if (regionId)   filter.region_id   = regionId;
    if (districtId) filter.district_id = districtId;
    if (req.scopeRegion)   filter.region_id   = req.scopeRegion;
    if (req.scopeDistrict) filter.district_id = req.scopeDistrict;
    const rows = await Disbursement.find(filter).sort({ created_at:-1 }).limit(Number(limit)||500).lean();
    res.json({ disbursements: rows.map(n) });
  } catch(e) { console.error('[disb/list]',e.message); res.json({ disbursements:[] }); }
};

// ── Annual summary for CEO ────────────────────────────────────────────────────
exports.annualSummary = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();
    const fy   = `${year}/${Number(year)+1}`;
    const [all, agg] = await Promise.all([
      Disbursement.find({}).sort({ created_at:-1 }).lean(),
      Disbursement.aggregate([
        { $group:{
          _id:'$status',
          count:{ $sum:1 },
          total:{ $sum:'$amount' },
        }},
      ]),
      
    ]);
    const byStatus  = Object.fromEntries(agg.map(a=>([a._id,{count:a.count,total:a.total}])));
    const byMonth   = {};
    all.forEach(d=>{
      const mo = (d.created_at||'').slice(0,7);
      if (!byMonth[mo]) byMonth[mo]={ month:mo, total:0, approved:0, pending:0, rejected:0, count:0 };
      byMonth[mo].total  += d.amount||0;
      byMonth[mo].count  += 1;
      if (d.status==='ceo_approved'||d.status==='disbursed') byMonth[mo].approved += d.amount||0;
      if (d.status==='pending_ceo')   byMonth[mo].pending  += d.amount||0;
      if (d.status==='ceo_rejected')  byMonth[mo].rejected += d.amount||0;
    });
    const totals = {
      all_time_total:     all.reduce((s,d)=>s+(d.amount||0),0),
      approved_total:     all.filter(d=>['ceo_approved','disbursed'].includes(d.status)).reduce((s,d)=>s+(d.amount||0),0),
      pending_total:      all.filter(d=>d.status==='pending_ceo').reduce((s,d)=>s+(d.amount||0),0),
      rejected_total:     all.filter(d=>d.status==='ceo_rejected').reduce((s,d)=>s+(d.amount||0),0),
      disbursed_total:    all.filter(d=>d.status==='disbursed').reduce((s,d)=>s+(d.amount||0),0),
      pending_count:      all.filter(d=>d.status==='pending_ceo').length,
      approved_count:     all.filter(d=>['ceo_approved','disbursed'].includes(d.status)).length,
      rejected_count:     all.filter(d=>d.status==='ceo_rejected').length,
    };
    res.json({ disbursements:all.map(n), by_status:byStatus, by_month:Object.values(byMonth).sort((a,b)=>a.month.localeCompare(b.month)), totals });
  } catch(e) { console.error('[disb/annual]',e.message); res.json({ disbursements:[], by_status:{}, by_month:[], totals:{} }); }
};

// ── Create disbursement request (National Finance) ────────────────────────────
exports.create = async (req, res) => {
  const { fiscal_year, term, level, region_id, district_id, caterer_id, recipient_name, amount, purpose, payment_method, bank_name, account_number, budget_id, notes } = req.body||{};
  if (!amount||!purpose||!level||!recipient_name) return res.status(400).json({ error:'amount, purpose, level and recipient_name are required' });
  const amt = Number(amount);
  if (isNaN(amt)||amt<=0) return res.status(400).json({ error:'amount must be a positive number' });
  const ref = `GSFP-DISB-${Date.now().toString(36).toUpperCase()}`;
  const id  = newId('dsb');
  await Disbursement.create({
    _id:id, reference:ref,
    fiscal_year: fiscal_year||new Date().getFullYear()+'/'+(new Date().getFullYear()+1),
    term:term||'Full Year',
    level, region_id:region_id||null, district_id:district_id||null, caterer_id:caterer_id||null,
    recipient_name:recipient_name.trim(), amount:amt, purpose:purpose.trim(),
    payment_method:payment_method||'Bank Transfer', bank_name:bank_name||null, account_number:account_number||null,
    status:'pending_ceo',
    created_by:req.user._id, created_by_name:req.user.name, created_by_role:req.user.role,
    created_at:nowISO(), budget_id:budget_id||null, notes:notes||null,
  });
  await audit({ user:req.user, action:'DISBURSEMENT_REQUESTED', target:id, details:`GHS ${amt.toLocaleString()} for ${recipient_name} — Awaiting CEO approval` });
  res.status(201).json({ disbursement:n(await Disbursement.findOne({_id:id}).lean()) });
};

// ── CEO approve ───────────────────────────────────────────────────────────────
exports.ceoApprove = async (req, res) => {
  if (!CEO_ROLES.includes(req.user.role)) return res.status(403).json({ error:'Only CEO or National Director can approve disbursements' });
  const { comment } = req.body||{};
  const d = await Disbursement.findOne({ _id:req.params.id });
  if (!d) return res.status(404).json({ error:'Disbursement not found' });
  if (d.status!=='pending_ceo') return res.status(409).json({ error:`Already ${d.status}` });
  d.status='ceo_approved'; d.ceo_id=req.user._id; d.ceo_name=req.user.name;
  d.ceo_decision_at=nowISO(); d.ceo_comment=comment||'Approved by CEO.';
  await d.save();
  // Update budget if linked
  if (d.budget_id) await Budget.updateOne({ _id:d.budget_id },{ $inc:{ disbursed:d.amount } });
  await audit({ user:req.user, action:'DISBURSEMENT_CEO_APPROVED', target:req.params.id, details:`GHS ${d.amount.toLocaleString()} — ${d.recipient_name}` });
  res.json({ disbursement:n(d.toObject()) });
};

// ── CEO reject ────────────────────────────────────────────────────────────────
exports.ceoReject = async (req, res) => {
  if (!CEO_ROLES.includes(req.user.role)) return res.status(403).json({ error:'Only CEO or National Director can reject disbursements' });
  const { comment } = req.body||{};
  if (!comment) return res.status(400).json({ error:'Rejection reason required' });
  const d = await Disbursement.findOne({ _id:req.params.id });
  if (!d) return res.status(404).json({ error:'Disbursement not found' });
  if (d.status!=='pending_ceo') return res.status(409).json({ error:`Already ${d.status}` });
  d.status='ceo_rejected'; d.ceo_id=req.user._id; d.ceo_name=req.user.name;
  d.ceo_decision_at=nowISO(); d.ceo_comment=comment;
  await d.save();
  await audit({ user:req.user, action:'DISBURSEMENT_CEO_REJECTED', target:req.params.id, details:`Rejected: ${comment}` });
  res.json({ disbursement:n(d.toObject()) });
};

// ── Execute disbursement (after CEO approval) ─────────────────────────────────
exports.execute = async (req, res) => {
  const d = await Disbursement.findOne({ _id:req.params.id });
  if (!d) return res.status(404).json({ error:'Disbursement not found' });
  if (d.status!=='ceo_approved') return res.status(409).json({ error:'CEO approval required before executing disbursement' });
  const { disbursement_reference } = req.body||{};
  d.status='disbursed'; d.disbursed_by=req.user._id; d.disbursed_at=nowISO();
  d.disbursement_reference=disbursement_reference||`EXEC-${Date.now().toString(36).toUpperCase()}`;
  await d.save();
  await audit({ user:req.user, action:'DISBURSEMENT_EXECUTED', target:req.params.id, details:`GHS ${d.amount.toLocaleString()} disbursed to ${d.recipient_name}` });
  res.json({ disbursement:n(d.toObject()) });
};

exports.get = async (req, res) => {
  const d = await Disbursement.findOne({ _id:req.params.id }).lean();
  if (!d) return res.status(404).json({ error:'Not found' });
  res.json({ disbursement:n(d) });
};
