const Expenditure = require('../models/Expenditure');
const { newId } = require('../utils/ids');

const ownerOnly = (req) => String(req.user._id || req.user.id);

// Add expenditure — caterer only, always their own
exports.add = async (req, res) => {
  if (req.user.role !== 'caterer') return res.status(403).json({ error:'Caterer accounts only' });
  const { date, category, item, amount, notes } = req.body;
  if (!date || !item || amount == null) return res.status(400).json({ error:'date, item, amount required' });
  const exp = await Expenditure.create({
    _id:newId('exp'), caterer_id:ownerOnly(req),
    date, category:category||'ingredients', item, amount:Number(amount), notes:notes||'',
  });
  res.status(201).json({ expenditure: exp });
};

// List — ONLY the owner's records. No officer, no other caterer, ever.
exports.list = async (req, res) => {
  if (req.user.role !== 'caterer') return res.status(403).json({ error:'Caterer accounts only — this data is private' });
  const filter = { caterer_id: ownerOnly(req) };
  if (req.query.month) filter.date = { $regex:`^${req.query.month}` };
  const expenditures = await Expenditure.find(filter).sort({ date:-1 }).limit(500);
  res.json({ expenditures });
};

exports.remove = async (req, res) => {
  if (req.user.role !== 'caterer') return res.status(403).json({ error:'Caterer accounts only' });
  const exp = await Expenditure.findById(req.params.id);
  if (!exp) return res.status(404).json({ error:'Not found' });
  if (exp.caterer_id !== ownerOnly(req)) return res.status(403).json({ error:'Not your record' });
  await exp.deleteOne();
  res.json({ ok:true });
};

// Budget guidance — compares spend vs expected income (days*enrolled*rate)
exports.guidance = async (req, res) => {
  if (req.user.role !== 'caterer') return res.status(403).json({ error:'Caterer accounts only' });
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const caterer_id = ownerOnly(req);

  const [exps, School, Report] = [
    await Expenditure.find({ caterer_id, date:{ $regex:`^${month}` } }),
    require('../models/School'), require('../models/Report'),
  ];
  const school  = await School.findById(req.user.school_id).catch(()=>null);
  const reports = await Report.find({ caterer_id, date:{ $regex:`^${month}` }, status:'approved' });

  const totalSpent    = exps.reduce((s,e)=>s+e.amount,0);
  const rate          = 2.00;
  const enrolled      = school?.enrolled || 0;
  const daysServed    = reports.length;
  const expectedIncome= daysServed * enrolled * rate;
  const balance       = expectedIncome - totalSpent;
  const spendRatio    = expectedIncome > 0 ? totalSpent / expectedIncome : 0;

  const byCategory = {};
  exps.forEach(e=>{ byCategory[e.category] = (byCategory[e.category]||0) + e.amount; });

  const tips = [];
  if (spendRatio > 1.0)       tips.push(`⚠ OVERSPENDING: You've spent GHS ${totalSpent.toFixed(2)} but expected income is only GHS ${expectedIncome.toFixed(2)}. You are GHS ${Math.abs(balance).toFixed(2)} over budget.`);
  else if (spendRatio > 0.85) tips.push(`⚠ CAUTION: You've used ${Math.round(spendRatio*100)}% of your expected income. Slow down spending to protect your margin.`);
  else if (spendRatio > 0)    tips.push(`✓ HEALTHY: You've used ${Math.round(spendRatio*100)}% of expected income. Estimated profit: GHS ${balance.toFixed(2)}.`);
  if ((byCategory.ingredients||0) > totalSpent*0.75 && totalSpent>0) tips.push('Ingredients take over 75% of spend — consider bulk buying or a cheaper supplier.');
  if ((byCategory.fuel||0) > totalSpent*0.2 && totalSpent>0)         tips.push('Fuel is above 20% of costs — consider improved stoves or bulk fuel purchase.');
  if (daysServed === 0)  tips.push('No approved feeding reports this month yet — income is based on approved days, so submit and get reports approved.');

  res.json({
    month, total_spent:totalSpent, expected_income:expectedIncome, balance,
    spend_ratio:Math.round(spendRatio*100), days_served:daysServed,
    enrolled, rate, by_category:byCategory,
    status: spendRatio>1?'over_budget':spendRatio>0.85?'warning':'healthy',
    tips,
  });
};
