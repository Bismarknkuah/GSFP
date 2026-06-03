const Budget     = require('../models/Budget');
const Allocation = require('../models/Allocation');
const Payment    = require('../models/Payment');
const { audit }  = require('../utils/audit');
const { n }      = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');

exports.getBudgets = async (req, res) => {
  try {
    const filter = {};
    if (req.query.level)      filter.level      = req.query.level;
    if (req.query.regionId)   filter.region_id  = req.query.regionId;
    if (req.query.districtId) filter.district_id= req.query.districtId;
    if (req.scopeRegion)      filter.region_id  = req.scopeRegion;
    if (req.scopeDistrict)    filter.district_id= req.scopeDistrict;
    const budgets = await Budget.find(filter).sort({ created_at:-1 }).lean();
    res.json({ budgets: budgets.map(n) });
  } catch(e) { console.error('[finance/budgets]',e.message); res.json({ budgets:[] }); }
};

exports.createBudget = async (req, res) => {
  const { fiscal_year, term, level, region_id, district_id, total_amount, notes } = req.body||{};
  if (!fiscal_year||!term||!level||total_amount===undefined||total_amount===null||total_amount==='')
    return res.status(400).json({ error:'fiscal_year, term, level and total_amount are required' });
  const amt = Number(total_amount);
  if (isNaN(amt) || amt < 0) return res.status(400).json({ error:'total_amount must be a valid positive number' });
  const id = newId('bgt');
  await Budget.create({ _id:id, fiscal_year:String(fiscal_year).trim(), term:String(term).trim(), level, region_id:region_id||null, district_id:district_id||null, total_amount:amt, allocated:0, disbursed:0, balance:amt, status:'active', created_by:req.user._id, notes:notes||null, created_at:nowISO() });
  await audit({ user:req.user, action:'BUDGET_CREATED', target:id, details:`${level} ${fiscal_year} ${term} — GHS ${amt.toLocaleString()}` });
  res.status(201).json({ budget: n(await Budget.findOne({_id:id}).lean()) });
};

exports.getAllocations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.budgetId)   filter.budget_id  = req.query.budgetId;
    if (req.query.regionId)   filter.region_id  = req.query.regionId;
    if (req.query.districtId) filter.district_id= req.query.districtId;
    const allocs = await Allocation.find(filter).sort({ created_at:-1 }).lean();
    res.json({ allocations: allocs.map(n) });
  } catch(e) { console.error('[finance/allocs]',e.message); res.json({ allocations:[] }); }
};

exports.createAllocation = async (req, res) => {
  const { budget_id, to_level, region_id, district_id, amount, purpose, reference } = req.body||{};
  if (!budget_id||!to_level||amount===undefined||amount===null||amount==='')
    return res.status(400).json({ error:'budget_id, to_level and amount are required' });
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error:'amount must be a positive number' });
  const budget = await Budget.findOne({ _id:budget_id });
  if (!budget) return res.status(404).json({ error:'Budget not found' });
  // Allow allocation even if it exceeds balance (just warn)
  const exceedsBalance = amt > budget.balance;
  budget.allocated += amt;
  budget.balance   -= amt;
  if (budget.balance < 0) budget.balance = 0;
  await budget.save();
  const id = newId('alc');
  await Allocation.create({ _id:id, budget_id, from_level:budget.level, to_level, region_id:region_id||null, district_id:district_id||null, amount:amt, purpose:purpose||null, status:'pending', reference:reference||null, created_by:req.user._id, notes:exceedsBalance?'WARNING: Allocation exceeded available balance':null, created_at:nowISO() });
  await audit({ user:req.user, action:'ALLOCATION_CREATED', target:id, details:`GHS ${amt.toLocaleString()} to ${to_level}` });
  res.status(201).json({ allocation: n(await Allocation.findOne({_id:id}).lean()), warning: exceedsBalance?'Amount exceeded budget balance — please review':null });
};

exports.approveAllocation = async (req, res) => {
  const alloc = await Allocation.findOne({ _id:req.params.id });
  if (!alloc) return res.status(404).json({ error:'Allocation not found' });
  if (alloc.status==='approved') return res.json({ allocation:n(alloc.toObject()), message:'Already approved' });
  alloc.status='approved'; alloc.approved_by=req.user._id; alloc.approved_at=nowISO();
  await alloc.save();
  // Update budget disbursed
  await Budget.updateOne({ _id:alloc.budget_id }, { $inc:{ disbursed:alloc.amount } });
  await audit({ user:req.user, action:'ALLOCATION_APPROVED', target:req.params.id, details:`GHS ${alloc.amount.toLocaleString()}` });
  res.json({ allocation: n(alloc.toObject()) });
};

exports.nationalSummary = async (req, res) => {
  try {
    const budgets  = await Budget.find({}).lean();
    const payments = await Payment.aggregate([{ $group:{ _id:null, total_paid:{$sum:'$amount_paid'}, total_arrears:{$sum:'$arrears_amount'}, count:{$sum:1} } }]);
    const national = budgets.filter(b=>b.level==='national').reduce((a,b)=>({ total:a.total+b.total_amount, allocated:a.allocated+b.allocated, disbursed:a.disbursed+b.disbursed, balance:a.balance+b.balance }),{ total:0, allocated:0, disbursed:0, balance:0 });
    res.json({ budgets, payments_summary:payments[0]||{ total_paid:0, total_arrears:0, count:0 }, national });
  } catch(e) { console.error('[finance/summary]',e.message); res.json({ budgets:[], payments_summary:{ total_paid:0, total_arrears:0, count:0 }, national:{ total:0, allocated:0, disbursed:0, balance:0 } }); }
};
