const EnrollmentRequest = require('../models/EnrollmentRequest');
const School = require('../models/School');
const AuditLog = require('../models/AuditLog');
const { newId, nowISO } = require('../utils/ids');

// Headmaster submits enrollment change request
exports.submit = async (req, res) => {
  const { school_id, requested_enrolled, change_type, reason, notes } = req.body;
  const school = await School.findById(school_id);
  if (!school) return res.status(404).json({ error: 'School not found' });
  const request = await EnrollmentRequest.create({
    _id: newId('enr'), school_id, headmaster_id: req.user._id||req.user.id,
    headmaster_name: req.user.name, current_enrolled: school.enrolled,
    requested_enrolled: Number(requested_enrolled), change_type, reason, notes,
    district_id: school.district_id, region_id: school.region_id,
  });
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role, action:'ENROLLMENT_REQUEST_SUBMITTED',
    target:school_id, details:`Requested enrollment change: ${school.enrolled} → ${requested_enrolled} (${change_type})`, level:'info' });
  res.status(201).json({ request });
};

// List enrollment requests
exports.list = async (req, res) => {
  const filter = {};
  if (req.user.role === 'headmaster') filter.headmaster_id = req.user._id||req.user.id;
  else if (req.user.role === 'district_director') filter.district_id = req.user.district_id;
  else if (req.user.role === 'dce') filter.district_id = req.user.district_id;
  if (req.query.status) filter.status = req.query.status;
  const requests = await EnrollmentRequest.find(filter).sort({ created_at:-1 }).limit(50);
  // Populate school names
  const School = require('../models/School');
  const schoolIds = [...new Set(requests.map(r=>r.school_id))];
  const schools = await School.find({ _id:{ $in:schoolIds } });
  const schoolMap = Object.fromEntries(schools.map(s=>[(s._id||s.id).toString(), s]));
  const populated = requests.map(r=>({ ...r.toObject(), school:schoolMap[r.school_id]||null }));
  res.json({ requests: populated });
};

// District director approves/rejects
exports.review = async (req, res) => {
  const { action, comment } = req.body;
  if (!['approved','rejected'].includes(action)) return res.status(400).json({ error:'Invalid action' });
  const request = await EnrollmentRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error:'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error:'Already reviewed' });
  request.status = action;
  request.reviewed_by = req.user._id||req.user.id;
  request.reviewer_name = req.user.name;
  request.reviewer_comment = comment;
  request.reviewed_at = new Date();
  await request.save();
  // If approved — update school enrollment
  if (action === 'approved') {
    await School.findByIdAndUpdate(request.school_id, { enrolled: request.requested_enrolled });
  }
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role, action:`ENROLLMENT_REQUEST_${action.toUpperCase()}`,
    target:request.school_id, details:`${action}: ${request.current_enrolled} → ${request.requested_enrolled}. ${comment||''}`, level:'info' });
  res.json({ request });
};
