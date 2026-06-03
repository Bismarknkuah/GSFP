const Report = require('../models/Report');
const User   = require('../models/User');
const School = require('../models/School');
const { audit } = require('../utils/audit');
const { n }     = require('../utils/normalize');
const { newId, nowISO, todayISO } = require('../utils/ids');

async function expand(r) {
  if (!r) return null;
  const [caterer, school, reviewer] = await Promise.all([
    User.findOne({_id:r.caterer_id}).select('-password_hash').lean(),
    School.findOne({_id:r.school_id}).select('_id code name town enrolled').lean(),
    r.reviewed_by ? User.findOne({_id:r.reviewed_by}).select('-password_hash').lean() : null,
  ]);
  return n({ ...r, caterer, school, reviewer });
}

exports.list = async (req, res) => {
  try {
    const { status, schoolId, districtId, regionId, from, to, limit } = req.query;
    const filter = {};
    if (status)     filter.status     = status;
    if (schoolId)   filter.school_id  = schoolId;
    if (districtId) filter.district_id= districtId;
    if (regionId)   filter.region_id  = regionId;
    if (from||to)   filter.date       = { ...(from?{$gte:from}:{}), ...(to?{$lte:to}:{}) };
    const u = req.user;
    if (u.school_id)        filter.school_id  = u.school_id;
    else if (req.scopeDistrict) filter.district_id = req.scopeDistrict;
    else if (req.scopeRegion)   filter.region_id   = req.scopeRegion;
    const rows = await Report.find(filter).sort({ date:-1 }).limit(Math.min(Number(limit)||500,2000)).lean();
    res.json({ reports: await Promise.all(rows.map(expand)) });
  } catch(e) { console.error('[reports/list]',e.message); res.json({ reports:[] }); }
};

exports.create = async (req, res) => {
  const u = req.user;
  if (!['caterer','data_entry'].includes(u.role)) return res.status(403).json({ error:'Only caterers can submit reports' });
  if (!u.school_id) return res.status(400).json({ error:'Your account is not linked to a school' });
  const { foodType, studentsFed, timeReady, timeServed, notes, date } = req.body;
  if (!foodType||!studentsFed) return res.status(400).json({ error:'foodType and studentsFed are required' });
  const reportDate = (date||todayISO()).slice(0,10);
  
  // Check for existing pending/approved report for today
  const existing = await Report.findOne({ school_id:u.school_id, date:reportDate, status:{$in:['pending','approved']} }).lean();
  if (existing) {
    if (existing.status==='approved') return res.status(409).json({ error:'Report already approved for this date' });
    return res.status(409).json({ error:'Report already pending for this date. Wait for headmaster review.' });
  }
  
  // If rejected, allow resubmission by archiving old and creating new
  const rejected = await Report.findOne({ school_id:u.school_id, date:reportDate, status:'rejected' }).lean();
  if (rejected) {
    await Report.updateOne({ _id:rejected._id }, { status:'archived', notes:(rejected.notes||'')+' [Resubmitted]' });
  }
  
  const school = await School.findOne({_id:u.school_id}).lean();
  const id = newId('rep');
  await Report.create({ _id:id, caterer_id:u._id, school_id:u.school_id, district_id:school?.district_id||null, region_id:school?.region_id||null, date:reportDate, food_type:foodType, students_fed:Number(studentsFed), time_ready:timeReady||null, time_served:timeServed||null, notes:notes||null, image_path:req.file?`/uploads/${req.file.filename}`:null, status:'pending', forwarded:false, submitted_at:nowISO(), is_resubmission:!!rejected });
  await audit({ user:u, action:rejected?'REPORT_RESUBMITTED':'REPORT_SUBMITTED', target:id, details:`${foodType}, ${studentsFed} pupils${rejected?' (resubmission)':''}` });
  res.status(201).json({ report: await expand(await Report.findOne({_id:id}).lean()), is_resubmission:!!rejected });
};

exports.review = async (req, res) => {
  if (req.user.role!=='headmaster') return res.status(403).json({ error:'Only headmasters can review reports' });
  const { decision, comment } = req.body||{};
  if (!['approved','rejected'].includes(decision)) return res.status(400).json({ error:"decision must be 'approved' or 'rejected'" });
  const r = await Report.findOne({ _id:req.params.id }).lean();
  if (!r) return res.status(404).json({ error:'Report not found' });
  if (req.user.school_id && r.school_id!==req.user.school_id) return res.status(403).json({ error:'Not from your school' });
  if (r.status!=='pending') return res.status(409).json({ error:`Report is already ${r.status}` });
  const finalComment = comment || (decision==='approved'?'Verified and approved.':'Rejected — please resubmit with correct information.');
  await Report.updateOne({ _id:req.params.id },{ status:decision, headmaster_comment:finalComment, reviewed_by:req.user._id, reviewed_at:nowISO(), forwarded:decision==='approved', regional_status:decision==='approved'?'pending_review':null });
  await audit({ user:req.user, action:decision==='approved'?'REPORT_APPROVED':'REPORT_REJECTED', target:req.params.id, details:finalComment });
  res.json({ report: await expand(await Report.findOne({_id:req.params.id}).lean()) });
};

exports.regionalReview = async (req, res) => {
  const { decision, comment } = req.body||{};
  if (!['approved','rejected'].includes(decision)) return res.status(400).json({ error:'Invalid decision' });
  const r = await Report.findOne({ _id:req.params.id }).lean();
  if (!r) return res.status(404).json({ error:'Report not found' });
  await Report.updateOne({ _id:req.params.id },{ regional_status:decision, regional_reviewed_by:req.user._id, regional_reviewed_at:nowISO() });
  await audit({ user:req.user, action:`REPORT_REGIONAL_${decision.toUpperCase()}`, target:req.params.id, details:comment||'' });
  res.json({ ok:true });
};
