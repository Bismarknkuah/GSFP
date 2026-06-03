const OfficialReport = require('../models/OfficialReport');
const User           = require('../models/User');
const Payment        = require('../models/Payment');
const Report         = require('../models/Report');
const School         = require('../models/School');
const NotificationLog= require('../models/NotificationLog');
const { audit }  = require('../utils/audit');
const { n }      = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');

// ── Routing table: who receives a report from each role ─────────────────────
// Returns {holder_role, level, label}
function getNextLevel(senderRole) {
  const routes = {
    // District → DCE first
    district_coordinator: { holder_role:'dce',                 level:'dce',              label:'DCE for approval' },
    finance_officer:       { holder_role:'dce',                 level:'dce',              label:'DCE for approval' },
    auditor:               { holder_role:'regional_auditor',    level:'regional',         label:'Regional Auditor' },
    monitoring_officer:    { holder_role:'dce',                 level:'dce',              label:'DCE for approval' },
    district_director:     { holder_role:'dce',                 level:'dce',              label:'DCE for approval' },
    // DCE → Regional
    dce:                   { holder_role:'regional_coordinator', level:'regional',        label:'Regional Coordinator' },
    // Regional → National Director
    regional_coordinator:  { holder_role:'regional_minister',   level:'regional_minister',label:'Regional Minister for approval' },
    regional_finance:      { holder_role:'regional_minister',   level:'regional_minister',label:'Regional Minister for approval' },
    regional_monitoring:   { holder_role:'regional_minister',   level:'regional_minister',label:'Regional Minister for approval' },
    regional_auditor:      { holder_role:'national_auditor',    level:'national_director',label:'National Auditor' },
    regional_minister:     { holder_role:'national_director',   level:'national_director',label:'National Coordinating Director' },
    // National → CEO (after National Director approval)
    national_director:     { holder_role:'ceo',                 level:'ceo',              label:'CEO' },
    national_finance:      { holder_role:'national_director',   level:'national_director',label:'National Director for approval' },
    national_auditor:      { holder_role:'ceo',                 level:'ceo',              label:'CEO' },
    national_monitoring:   { holder_role:'national_director',   level:'national_director',label:'National Director for approval' },
    national_admin:        { holder_role:'national_director',   level:'national_director',label:'National Director for approval' },
  };
  return routes[senderRole] || { holder_role:'national_director', level:'national_director', label:'National Director' };
}

// Find the right user to receive the report in the right region/district
async function findReceiver(holderRole, regionId, districtId) {
  const filter = { role:holderRole, active:true };
  if (['dce','district_coordinator','auditor','monitoring_officer','finance_officer','district_director'].includes(holderRole)) {
    if (districtId) filter.district_id = districtId;
  } else if (['regional_coordinator','regional_minister','regional_auditor','regional_finance','regional_monitoring'].includes(holderRole)) {
    if (regionId) filter.region_id = regionId;
  }
  return User.findOne(filter).lean();
}

// Build snapshot stats for the report period
async function buildStats(userId, districtId, regionId) {
  const filter = {};
  if (districtId) filter.district_id = districtId;
  else if (regionId) filter.region_id = regionId;
  const [schools, approvedReports, payments] = await Promise.all([
    School.countDocuments({ active:true, ...filter }),
    Report.countDocuments({ status:'approved', ...filter }),
    Payment.find(filter).lean(),
  ]);
  const totalMeals   = await Report.aggregate([{$match:{...filter,status:'approved'}},{$group:{_id:null,total:{$sum:'$students_fed'}}}]);
  const totalPaid    = payments.reduce((s,p)=>s+p.amount_paid,0);
  const totalArrears = payments.reduce((s,p)=>s+p.arrears_amount,0);
  const totalReports = await Report.countDocuments(filter);
  return {
    schools_count: schools,
    total_meals:   totalMeals[0]?.total||0,
    total_paid:    totalPaid,
    total_arrears: totalArrears,
    compliance_rate: totalReports>0?Math.round(approvedReports/totalReports*100):0,
  };
}

// ── Submit report ─────────────────────────────────────────────────────────────
exports.submit = async (req, res) => {
  const { subject, content, report_type, period, include_stats } = req.body||{};
  if (!subject||!content) return res.status(400).json({ error:'subject and content required' });
  const u = req.user;
  const next = getNextLevel(u.role);
  const receiver = await findReceiver(next.holder_role, u.region_id, u.district_id);
  const stats = include_stats ? await buildStats(u._id, u.district_id, u.region_id) : {};
  const ref = `RPT-${Date.now().toString(36).toUpperCase()}`;
  const id  = newId('orpt');
  const now = nowISO();
  await OfficialReport.create({
    _id:id, reference:ref, report_type:report_type||'monthly', subject:subject.trim(), content:content.trim(), period:period||new Date().toLocaleDateString('en-GH',{month:'long',year:'numeric'}),
    submitted_by:u._id, submitted_by_name:u.name, submitted_by_role:u.role, submitted_at:now,
    district_id:u.district_id||null, region_id:u.region_id||null,
    current_holder:receiver?._id||null, current_holder_role:next.holder_role,
    current_level:next.level, origin_level:u.role,
    status: next.level==='dce'?'with_dce':next.level==='regional'||next.level==='regional_minister'?'with_rfc':'with_national',
    chain:[{ level:u.role, actor_id:u._id, actor_name:u.name, actor_role:u.role, action:'submitted', comment:`Submitted to: ${next.label}`, timestamp:now }],
    ...stats, created_at:now, updated_at:now,
  });
  await audit({ user:u, action:'OFFICIAL_REPORT_SUBMITTED', target:id, details:`${report_type} report to ${next.label}` });
  res.status(201).json({ report:n(await OfficialReport.findOne({_id:id}).lean()), next_level:next.label });
};

// ── List reports (inbox/sent) ─────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { box, status, type } = req.query;
    const u = req.user;
    let filter = {};
    if (box==='sent') {
      filter.submitted_by = u._id;
    } else if (box==='chain') {
      // Reports that passed through this user's level
      filter['chain.actor_id'] = u._id;
    } else {
      // Inbox: reports where current_holder is me, OR my role matches current_holder_role in my scope
      const scopeFilter = { current_holder_role:u.role };
      if (u.district_id) scopeFilter.district_id = u.district_id;
      if (u.region_id&&!u.district_id) scopeFilter.region_id = u.region_id;
      filter = scopeFilter;
    }
    if (status) filter.status = status;
    if (type)   filter.report_type = type;
    const reports = await OfficialReport.find(filter).sort({ created_at:-1 }).limit(200).lean();
    res.json({ reports:reports.map(n) });
  } catch(e) { console.error(e); res.json({ reports:[] }); }
};

// ── Action on a report ────────────────────────────────────────────────────────
exports.action = async (req, res) => {
  const { action, comment, analysis, rejection_reason } = req.body||{};
  if (!['approve','reject','comment','forward'].includes(action)) return res.status(400).json({ error:'Invalid action' });
  const rpt = await OfficialReport.findOne({ _id:req.params.id });
  if (!rpt) return res.status(404).json({ error:'Report not found' });

  const u = req.user;
  const now = nowISO();
  const entry = { level:rpt.current_level, actor_id:u._id, actor_name:u.name, actor_role:u.role, action, comment:comment||null, analysis:analysis||null, timestamp:now };
  rpt.chain.push(entry);
  rpt.updated_at = now;

  if (action==='reject') {
    rpt.status = 'rejected';
    rpt.rejected_at_level = rpt.current_level;
    rpt.rejection_reason  = rejection_reason||comment||'Rejected';
  } else if (action==='approve'||action==='forward') {
    // Forward to next level
    const next = getNextLevel(u.role);
    const receiver = await findReceiver(next.holder_role, rpt.region_id, rpt.district_id);
    rpt.current_holder      = receiver?._id||null;
    rpt.current_holder_role = next.holder_role;
    rpt.current_level       = next.level;
    rpt.chain.push({ level:next.level, actor_id:receiver?._id||'system', actor_name:receiver?.name||next.label, actor_role:next.holder_role, action:'received', comment:`Received from ${u.name} (${u.role})`, timestamp:now });
    rpt.status = next.level==='ceo'?'with_ceo':next.level==='national_director'?'with_national':next.level==='regional'||next.level==='regional_minister'?'with_rfc':'with_dce';
    if (next.level==='ceo') rpt.status = 'with_ceo';
  }

  await rpt.save();
  await audit({ user:u, action:`OFFICIAL_REPORT_${action.toUpperCase()}`, target:rpt._id, details:`${rpt.subject}` });
  res.json({ report:n(rpt.toObject()) });
};

exports.get = async (req, res) => {
  const rpt = await OfficialReport.findOne({ _id:req.params.id }).lean();
  if (!rpt) return res.status(404).json({ error:'Not found' });
  res.json({ report:n(rpt) });
};

exports.stats = async (req, res) => {
  try {
    const u = req.user;
    const inboxFilter = { current_holder_role:u.role };
    if (u.district_id) inboxFilter.district_id = u.district_id;
    if (u.region_id&&!u.district_id) inboxFilter.region_id = u.region_id;
    const [inbox,sent,pending] = await Promise.all([
      OfficialReport.countDocuments(inboxFilter),
      OfficialReport.countDocuments({ submitted_by:u._id }),
      OfficialReport.countDocuments({ ...inboxFilter, status:{ $in:['with_dce','with_rfc','with_national','with_ceo'] } }),
    ]);
    res.json({ inbox,sent,pending });
  } catch(e) { res.json({ inbox:0,sent:0,pending:0 }); }
};
