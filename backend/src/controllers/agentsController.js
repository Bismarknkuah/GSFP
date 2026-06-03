const AgentAlert  = require('../models/AgentAlert');
const AgentRun    = require('../models/AgentRun');
const Report      = require('../models/Report');
const Payment     = require('../models/Payment');
const School      = require('../models/School');
const User        = require('../models/User');
const Disbursement= require('../models/Disbursement');
const GhanaCard   = require('../models/GhanaCard');
const { audit }   = require('../utils/audit');
const { n }       = require('../utils/normalize');
const { newId, nowISO, daysAgoISO, todayISO } = require('../utils/ids');

// ── Agent definitions ──────────────────────────────────────────────────────────
const AGENTS = {
  compliance: {
    name: 'Compliance Monitor',
    type: 'compliance',
    description: 'Monitors daily report submission rates and flags non-compliant schools',
  },
  fraud: {
    name: 'Fraud Detection Agent',
    type: 'fraud',
    description: 'Detects anomalous payment patterns, duplicate submissions, and suspicious activity',
  },
  financial: {
    name: 'Financial Audit Agent',
    type: 'financial',
    description: 'Reviews budget utilisation, payment arrears, and disbursement irregularities',
  },
  data_quality: {
    name: 'Data Quality Agent',
    type: 'data_quality',
    description: 'Validates data integrity, detects missing records, and ensures consistency',
  },
  security: {
    name: 'Security Agent',
    type: 'security',
    description: 'Monitors login patterns, unverified users, and access anomalies',
  },
};

async function createAlert(data) {
  const id = newId('alt');
  return AgentAlert.create({ _id:id, ...data, status:'open', created_at:nowISO() });
}

// ── COMPLIANCE AGENT ───────────────────────────────────────────────────────────
async function runComplianceAgent(runId, triggeredBy) {
  const alerts = [];
  const today = todayISO();
  const yesterday = daysAgoISO(1);

  // Check schools with no report today
  const schools = await School.find({ active:true }).lean();
  const todayReports = await Report.find({ date:today, status:{ $in:['pending','approved'] } }).lean();
  const reportedSchools = new Set(todayReports.map(r=>r.school_id));

  for (const school of schools) {
    if (!reportedSchools.has(school._id)) {
      alerts.push({ agent_name:'Compliance Monitor', agent_type:'compliance', severity:'warning',
        title:`No report submitted — ${school.name}`,
        description:`${school.name} in ${school.town} has not submitted a feeding report for today (${today}).`,
        affected_entity:school._id, affected_entity_type:'school',
        district_id:school.district_id, region_id:school.region_id,
        data:{ school_code:school.code, enrolled:school.enrolled, last_date:yesterday },
      });
    }
  }

  // Check schools with >5 consecutive missing days
  const weekAgo = daysAgoISO(7);
  for (const school of schools.slice(0, 20)) { // limit to avoid timeout
    const weekReports = await Report.countDocuments({ school_id:school._id, date:{ $gte:weekAgo }, status:{ $in:['pending','approved'] } });
    if (weekReports < 3) {
      alerts.push({ agent_name:'Compliance Monitor', agent_type:'compliance', severity:'critical',
        title:`Chronic non-compliance — ${school.name}`,
        description:`${school.name} submitted only ${weekReports} reports in the last 7 days. Minimum expected: 5.`,
        affected_entity:school._id, affected_entity_type:'school',
        district_id:school.district_id, region_id:school.region_id,
        data:{ reports_last_7_days:weekReports, school_code:school.code },
      });
    }
  }

  return alerts;
}

// ── FRAUD DETECTION AGENT ──────────────────────────────────────────────────────
async function runFraudAgent(runId, triggeredBy) {
  const alerts = [];

  // Detect over-enrollment claims (fed > enrolled * 1.1)
  const recentReports = await Report.find({ status:'approved', date:{ $gte:daysAgoISO(30) } }).lean();
  const schools = await School.find({}).lean();
  const schoolMap = Object.fromEntries(schools.map(s=>[s._id,s]));

  for (const r of recentReports) {
    const school = schoolMap[r.school_id];
    if (school && r.students_fed > school.enrolled * 1.15) {
      alerts.push({ agent_name:'Fraud Detection Agent', agent_type:'fraud', severity:'critical',
        title:`Over-count detected — ${school.name}`,
        description:`Report on ${r.date} claims ${r.students_fed} pupils fed, but school enrollment is only ${school.enrolled}. Excess: ${r.students_fed - school.enrolled} pupils (${Math.round((r.students_fed/school.enrolled-1)*100)}% over).`,
        affected_entity:r._id, affected_entity_type:'report',
        district_id:r.district_id, region_id:r.region_id, school_id:r.school_id,
        data:{ reported:r.students_fed, enrolled:school.enrolled, date:r.date, excess:r.students_fed-school.enrolled },
      });
    }
  }

  // Detect duplicate payments (same caterer, same period, multiple records)
  const payments = await Payment.find({}).lean();
  const payMap = {};
  for (const p of payments) {
    const key = `${p.caterer_id}-${p.period}`;
    if (!payMap[key]) payMap[key] = [];
    payMap[key].push(p);
  }
  for (const [key, recs] of Object.entries(payMap)) {
    if (recs.length > 1) {
      const [catererId] = key.split('-');
      const caterer = await User.findOne({_id:catererId}).lean();
      alerts.push({ agent_name:'Fraud Detection Agent', agent_type:'fraud', severity:'critical',
        title:`Duplicate payment records detected`,
        description:`Caterer ${caterer?.name||catererId} has ${recs.length} payment records for the same period "${recs[0].period}". Total: GHS ${recs.reduce((s,p)=>s+p.amount_paid,0).toLocaleString()}.`,
        affected_entity:catererId, affected_entity_type:'caterer',
        data:{ period:recs[0].period, count:recs.length, total_paid:recs.reduce((s,p)=>s+p.amount_paid,0) },
      });
    }
  }

  // Detect unverified caterers receiving payments
  const catererIds = [...new Set(payments.map(p=>p.caterer_id))];
  for (const cid of catererIds.slice(0,50)) {
    const gc = await GhanaCard.findOne({ user_id:cid }).lean();
    if (!gc || gc.verification_status!=='verified') {
      const caterer = await User.findOne({_id:cid,role:'caterer'}).lean();
      if (caterer) {
        alerts.push({ agent_name:'Fraud Detection Agent', agent_type:'fraud', severity:'warning',
          title:`Unverified caterer receiving payments — ${caterer.name}`,
          description:`Caterer ${caterer.name} has payment records but has not completed Ghana Card verification. Payment disbursement should be withheld pending verification.`,
          affected_entity:cid, affected_entity_type:'caterer',
          district_id:caterer.district_id, region_id:caterer.region_id,
          data:{ verification_status: gc?.verification_status||'not_submitted' },
        });
      }
    }
  }

  return alerts;
}

// ── FINANCIAL AUDIT AGENT ──────────────────────────────────────────────────────
async function runFinancialAgent(runId, triggeredBy) {
  const alerts = [];
  const payments = await Payment.find({}).lean();

  // High arrears threshold: schools with >20 days arrears
  for (const p of payments) {
    if (p.days_arrears > 20) {
      const caterer = await User.findOne({_id:p.caterer_id}).lean();
      alerts.push({ agent_name:'Financial Audit Agent', agent_type:'financial', severity:p.days_arrears>40?'critical':'warning',
        title:`High payment arrears — ${caterer?.name||'Unknown'}`,
        description:`${caterer?.name} has ${p.days_arrears} days in arrears for period "${p.period}". Outstanding: GHS ${p.arrears_amount.toLocaleString()}.`,
        affected_entity:p.caterer_id, affected_entity_type:'caterer',
        district_id:p.district_id, region_id:p.region_id,
        data:{ days_arrears:p.days_arrears, arrears_amount:p.arrears_amount, period:p.period },
      });
    }
  }

  // Disbursements pending CEO >72 hours
  const Disbursement = require('../models/Disbursement');
  const pending = await Disbursement.find({ status:'pending_ceo' }).lean();
  const cutoff = new Date(Date.now() - 72*60*60*1000).toISOString();
  for (const d of pending) {
    if (d.created_at < cutoff) {
      alerts.push({ agent_name:'Financial Audit Agent', agent_type:'financial', severity:'warning',
        title:`Disbursement pending CEO approval >72hrs`,
        description:`Disbursement ${d.reference} for GHS ${d.amount.toLocaleString()} (${d.recipient_name}) has been awaiting CEO approval for more than 72 hours. Requested: ${d.created_at?.slice(0,10)}.`,
        affected_entity:d._id, affected_entity_type:'disbursement',
        data:{ reference:d.reference, amount:d.amount, recipient:d.recipient_name, requested_at:d.created_at },
      });
    }
  }

  return alerts;
}

// ── DATA QUALITY AGENT ──────────────────────────────────────────────────────────
async function runDataQualityAgent(runId, triggeredBy) {
  const alerts = [];

  // Schools with no headmaster assigned
  const noHead = await School.find({ active:true, $or:[{headmaster_id:null},{headmaster_id:''}] }).lean();
  for (const s of noHead) {
    alerts.push({ agent_name:'Data Quality Agent', agent_type:'data_quality', severity:'warning',
      title:`School missing headmaster — ${s.name}`,
      description:`${s.name} (${s.code}) has no headmaster assigned. Reports cannot be approved.`,
      affected_entity:s._id, affected_entity_type:'school',
      district_id:s.district_id, region_id:s.region_id, school_id:s._id,
      data:{ school_code:s.code },
    });
  }

  // Schools with no caterer assigned
  const noCaterer = await School.find({ active:true, $or:[{caterer_id:null},{caterer_id:''}] }).lean();
  for (const s of noCaterer) {
    alerts.push({ agent_name:'Data Quality Agent', agent_type:'data_quality', severity:'critical',
      title:`School missing caterer — ${s.name}`,
      description:`${s.name} (${s.code}) has no caterer assigned. Feeding reports cannot be submitted.`,
      affected_entity:s._id, affected_entity_type:'school',
      district_id:s.district_id, region_id:s.region_id, school_id:s._id,
      data:{ school_code:s.code },
    });
  }

  // Users with no district/region assignment (except national roles)
  const unassigned = await User.find({ active:true, role:{ $in:['caterer','headmaster','district_coordinator','district_director'] }, $or:[{district_id:null},{district_id:''}] }).lean();
  for (const u of unassigned.slice(0,10)) {
    alerts.push({ agent_name:'Data Quality Agent', agent_type:'data_quality', severity:'warning',
      title:`User missing district assignment — ${u.name}`,
      description:`${u.name} (${u.role}) has no district assigned. They may have limited system access.`,
      affected_entity:u._id, affected_entity_type:'user',
      data:{ role:u.role, username:u.username },
    });
  }

  return alerts;
}

// ── SECURITY AGENT ─────────────────────────────────────────────────────────────
async function runSecurityAgent(runId, triggeredBy) {
  const alerts = [];

  // Count unverified caterers (no Ghana Card)
  const caterers = await User.find({ role:'caterer', active:true }).lean();
  const verifiedIds = new Set((await GhanaCard.find({ verification_status:'verified' }).lean()).map(g=>g.user_id));
  const unverified = caterers.filter(c=>!verifiedIds.has(c._id));

  if (unverified.length > 0) {
    alerts.push({ agent_name:'Security Agent', agent_type:'security', severity: unverified.length>10?'critical':'warning',
      title:`${unverified.length} caterers without Ghana Card verification`,
      description:`${unverified.length} of ${caterers.length} caterers have not completed Ghana Card identity verification. This creates financial accountability risk.`,
      affected_entity:'system', affected_entity_type:'system',
      data:{ unverified_count:unverified.length, total_caterers:caterers.length, percentage:Math.round(unverified.length/caterers.length*100) },
    });
  }

  // Check for inactive users with recent activity
  const inactiveWithReports = await Report.aggregate([
    { $lookup:{ from:'users', localField:'caterer_id', foreignField:'_id', as:'caterer' } },
    { $match:{ date:{ $gte:daysAgoISO(7) }, 'caterer.active':false } },
    { $count:'total' },
  ]);
  if (inactiveWithReports[0]?.total > 0) {
    alerts.push({ agent_name:'Security Agent', agent_type:'security', severity:'critical',
      title:`Reports from deactivated accounts detected`,
      description:`${inactiveWithReports[0].total} feeding reports were submitted by deactivated user accounts in the last 7 days. Immediate investigation required.`,
      affected_entity:'system', affected_entity_type:'system',
      data:{ count:inactiveWithReports[0].total },
    });
  }

  return alerts;
}

// ── Run all agents ─────────────────────────────────────────────────────────────
exports.runAgents = async (req, res) => {
  const { agentType } = req.body||{};
  const results = [];
  const agentsToRun = agentType ? [agentType] : Object.keys(AGENTS);

  for (const type of agentsToRun) {
    const agent = AGENTS[type];
    if (!agent) continue;
    const runId = newId('run');
    await AgentRun.create({ _id:runId, agent_name:agent.name, agent_type:type, status:'running', started_at:nowISO(), triggered_by:req.user._id });
    try {
      let alerts = [];
      if (type==='compliance')   alerts = await runComplianceAgent(runId, req.user._id);
      if (type==='fraud')        alerts = await runFraudAgent(runId, req.user._id);
      if (type==='financial')    alerts = await runFinancialAgent(runId, req.user._id);
      if (type==='data_quality') alerts = await runDataQualityAgent(runId, req.user._id);
      if (type==='security')     alerts = await runSecurityAgent(runId, req.user._id);

      // Only create new alerts (deduplicate by title+entity)
      let created = 0;
      for (const alertData of alerts) {
        const exists = await AgentAlert.findOne({ title:alertData.title, affected_entity:alertData.affected_entity, status:{ $in:['open','acknowledged'] } }).lean();
        if (!exists) { await createAlert(alertData); created++; }
      }

      await AgentRun.updateOne({ _id:runId }, { status:'completed', completed_at:nowISO(), findings_count:alerts.length, alerts_created:created, summary:`Found ${alerts.length} issues, created ${created} new alerts.` });
      results.push({ agent:agent.name, type, findings:alerts.length, new_alerts:created, status:'completed' });
    } catch(e) {
      console.error(`[agent/${type}]`, e.message);
      await AgentRun.updateOne({ _id:runId }, { status:'failed', completed_at:nowISO(), error:e.message });
      results.push({ agent:agent.name, type, status:'failed', error:e.message });
    }
  }

  await audit({ user:req.user, action:'AGENTS_RUN', target:'system', details:agentsToRun.join(',') });
  res.json({ results, agents_run:agentsToRun.length });
};

exports.listAlerts = async (req, res) => {
  try {
    const { type, severity, status, regionId, districtId } = req.query;
    const filter = {};
    if (type)       filter.agent_type = type;
    if (severity)   filter.severity   = severity;
    if (status)     filter.status     = status;
    if (regionId)   filter.region_id  = regionId;
    if (districtId) filter.district_id= districtId;
    if (req.scopeRegion)   filter.region_id  = req.scopeRegion;
    if (req.scopeDistrict) filter.district_id= req.scopeDistrict;
    const alerts = await AgentAlert.find(filter).sort({ created_at:-1 }).limit(200).lean();
    const summary = {
      open:     alerts.filter(a=>a.status==='open').length,
      critical: alerts.filter(a=>a.severity==='critical'&&a.status==='open').length,
      warning:  alerts.filter(a=>a.severity==='warning'&&a.status==='open').length,
      acknowledged: alerts.filter(a=>a.status==='acknowledged').length,
    };
    res.json({ alerts:alerts.map(n), summary });
  } catch(e) { res.json({ alerts:[], summary:{open:0,critical:0,warning:0,acknowledged:0} }); }
};

exports.acknowledgeAlert = async (req, res) => {
  const alert = await AgentAlert.findOne({ _id:req.params.id });
  if (!alert) return res.status(404).json({ error:'Alert not found' });
  alert.status='acknowledged'; alert.acknowledged_by=req.user._id; alert.acknowledged_at=nowISO();
  await alert.save();
  res.json({ alert:n(alert.toObject()) });
};

exports.resolveAlert = async (req, res) => {
  const { resolution_note } = req.body||{};
  const alert = await AgentAlert.findOne({ _id:req.params.id });
  if (!alert) return res.status(404).json({ error:'Alert not found' });
  alert.status='resolved'; alert.resolved_by=req.user._id; alert.resolved_at=nowISO();
  alert.resolution_note=resolution_note||'Resolved.';
  await alert.save();
  res.json({ alert:n(alert.toObject()) });
};

exports.listRuns = async (req, res) => {
  const runs = await AgentRun.find({}).sort({ started_at:-1 }).limit(50).lean();
  res.json({ runs:runs.map(n) });
};

exports.getAgentList = (_req, res) => res.json({ agents: Object.values(AGENTS) });

exports.dashboardStats = async (req, res) => {
  try {
    const [open,critical,runs,byType] = await Promise.all([
      AgentAlert.countDocuments({ status:'open' }),
      AgentAlert.countDocuments({ status:'open', severity:'critical' }),
      AgentRun.find({}).sort({ started_at:-1 }).limit(5).lean(),
      AgentAlert.aggregate([{ $match:{ status:'open' } },{ $group:{ _id:'$agent_type', count:{ $sum:1 } } }]),
    ]);
    res.json({ open_alerts:open, critical_alerts:critical, recent_runs:runs.map(n), by_type:Object.fromEntries(byType.map(b=>[b._id,b.count])) });
  } catch(e) { res.json({ open_alerts:0, critical_alerts:0, recent_runs:[], by_type:{} }); }
};
