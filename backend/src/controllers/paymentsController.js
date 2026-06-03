const Payment = require('../models/Payment');
const Report  = require('../models/Report');
const User    = require('../models/User');
const School  = require('../models/School');
const { audit } = require('../utils/audit');
const { n } = require('../utils/normalize');
const { newId, nowISO, todayISO } = require('../utils/ids');

async function expand(p) {
  if (!p) return null;
  const caterer = await User.findOne({_id:p.caterer_id}).select('-password_hash').lean();
  const school  = caterer?.school_id ? await School.findOne({_id:caterer.school_id}).lean() : null;
  return n({ ...p, caterer, school });
}

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.catererId)  filter.caterer_id  = req.query.catererId;
  if (req.query.districtId) filter.district_id = req.query.districtId;
  if (req.query.regionId)   filter.region_id   = req.query.regionId;
  if (req.user.role==='caterer') {
    const school = await School.findOne({_id:req.user.school_id}).lean();
    if (school) filter.caterer_id = { $in:[school.caterer_id,school.caterer2_id].filter(Boolean) };
    else filter.caterer_id = req.user._id;
  } else if (req.scopeDistrict) filter.district_id = req.scopeDistrict;
  else if (req.scopeRegion)     filter.region_id   = req.scopeRegion;
  const rows = await Payment.find(filter).sort({ created_at:-1 }).lean();
  res.json({ payments: await Promise.all(rows.map(expand)) });
};

exports.create = async (req, res) => {
  const { catererId, period, daysCovered, daysPaid, ratePerStudent, amountPaid, lastPaymentDate, reference, notes } = req.body||{};
  if (!catererId||!period) return res.status(400).json({ error:'catererId and period required' });
  const caterer = await User.findOne({_id:catererId,role:'caterer'}).lean();
  if (!caterer) return res.status(404).json({ error:'Caterer not found' });
  const school  = caterer.school_id ? await School.findOne({_id:caterer.school_id}).lean() : null;
  const covered = Number(daysCovered)||0, paid=Number(daysPaid)||0, rate=Number(ratePerStudent)||1.20;
  const arrears = Math.max(0,covered-paid);
  const enrolled= school?.enrolled||0;
  const id = newId('pay');
  await Payment.create({ _id:id, caterer_id:catererId, district_id:caterer.district_id||null, region_id:caterer.region_id||null, period, meals_served:paid*enrolled, days_covered:covered, days_paid:paid, days_arrears:arrears, rate_per_student:rate, amount_paid:Number(amountPaid)||paid*enrolled*rate, arrears_amount:arrears*enrolled*rate, status:arrears===0?'fully-paid':'partial', last_payment_date:lastPaymentDate||todayISO(), source:'National Government - GSFP', reference:reference||null, notes:notes||null, visible_to_oversight:true, created_at:nowISO() });
  await audit({ user:req.user, action:'PAYMENT_RECORDED', target:id });
  res.status(201).json({ payment: await expand(await Payment.findOne({_id:id}).lean()) });
};

exports.update = async (req, res) => {
  const p = await Payment.findOne({_id:req.params.id});
  if (!p) return res.status(404).json({ error:'Payment not found' });
  const map = { daysPaid:'days_paid', daysArrears:'days_arrears', amountPaid:'amount_paid', arrearsAmount:'arrears_amount', status:'status', lastPaymentDate:'last_payment_date', reference:'reference', notes:'notes' };
  for (const [k,f] of Object.entries(map)) { if (req.body[k]!==undefined) p[f]=req.body[k]; }
  await p.save();
  await audit({ user:req.user, action:'PAYMENT_UPDATED', target:req.params.id });
  res.json({ payment: await expand(await Payment.findOne({_id:req.params.id}).lean()) });
};

exports.selfReport = async (req, res) => {
  if (req.user.role!=='caterer') return res.status(403).json({ error:'Only caterers' });
  const { period, receivedAmount, receivedDate, reference, notes } = req.body||{};
  if (!period||!receivedAmount) return res.status(400).json({ error:'period and receivedAmount required' });
  const school   = await School.findOne({_id:req.user.school_id}).lean();
  if (!school) return res.status(400).json({ error:'No school linked' });
  const rate=req.user.rate_per_student||1.20, amt=Number(receivedAmount);
  const paid=Math.round(amt/(rate*school.enrolled)), covered=await Report.countDocuments({school_id:school._id,status:'approved'});
  const arrears=Math.max(0,covered-paid);
  const isDual=!!school.caterer2_id;
  const id=newId('pay');
  await Payment.create({ _id:id, caterer_id:req.user._id, district_id:school.district_id, region_id:school.region_id, period, meals_served:paid*school.enrolled, days_covered:covered, days_paid:paid, days_arrears:arrears, rate_per_student:rate, amount_paid:amt, arrears_amount:arrears*rate*school.enrolled, status:arrears===0?'fully-paid':'partial', last_payment_date:receivedDate||todayISO(), source:'National Government - GSFP', reference:reference||null, notes:notes||null, caterer_reported:true, received_amount:amt, received_date:receivedDate||todayISO(), co_approval_required:isDual, co_approved:isDual?null:true, visible_to_oversight:!isDual, created_at:nowISO() });
  res.status(201).json({ payment: await expand(await Payment.findOne({_id:id}).lean()) });
};

exports.summary = async (req, res) => {
  const filter = {};
  if (req.scopeDistrict) filter.district_id=req.scopeDistrict;
  if (req.scopeRegion)   filter.region_id  =req.scopeRegion;
  const agg = await Payment.aggregate([{$match:filter},{$group:{_id:null,records:{$sum:1},total_paid:{$sum:'$amount_paid'},total_arrears:{$sum:'$arrears_amount'},days_covered:{$sum:'$days_covered'},days_paid:{$sum:'$days_paid'}}}]);
  res.json({ summary: agg[0]||{records:0,total_paid:0,total_arrears:0,days_covered:0,days_paid:0} });
};
