const EnrollmentRequest = require('../models/EnrollmentRequest');
const School            = require('../models/School');
const AuditLog          = require('../models/AuditLog');
const { newId, nowISO } = require('../utils/ids');

// Headmaster submits enrollment change request
exports.submit = async (req, res) => {
  const { school_id, requested_enrolled, change_type, reason, notes } = req.body;

  if (!school_id)          return res.status(400).json({ error: 'school_id is required' });
  if (!requested_enrolled) return res.status(400).json({ error: 'requested_enrolled is required' });
  if (!change_type)        return res.status(400).json({ error: 'change_type is required' });
  if (!reason)             return res.status(400).json({ error: 'reason is required' });

  const school = await School.findById(school_id);
  if (!school) return res.status(404).json({ error: 'School not found' });

  const id = newId('enr');                  // e.g. "enr-3852e59df2"

  const request = new EnrollmentRequest({
    _id:                String(id),          // force String — never ObjectId
    school_id:          String(school_id),
    headmaster_id:      String(req.user._id || req.user.id),
    headmaster_name:    req.user.name,
    current_enrolled:   Number(school.enrolled),
    requested_enrolled: Number(requested_enrolled),
    change_type,
    reason,
    notes:              notes || null,
    district_id:        school.district_id ? String(school.district_id) : null,
    region_id:          school.region_id   ? String(school.region_id)   : null,
    status:             'pending',
    created_at:         new Date(),
  });

  await request.save();

  await AuditLog.create({
    _id:       newId('aud'),
    timestamp: nowISO(),
    user_id:   String(req.user._id || req.user.id),
    user_name: req.user.name,
    user_role: req.user.role,
    action:    'ENROLLMENT_REQUEST_SUBMITTED',
    target:    school_id,
    details:   `Enrollment change request: ${school.enrolled} → ${requested_enrolled} (${change_type})`,
    level:     'info',
  });

  res.status(201).json({ request });
};

// List enrollment requests
exports.list = async (req, res) => {
  const filter = {};

  if (req.user.role === 'headmaster') {
    filter.headmaster_id = String(req.user._id || req.user.id);
  } else if (['district_director','dce','district_coordinator','finance_officer','auditor','monitoring_officer'].includes(req.user.role)) {
    if (req.user.district_id) filter.district_id = String(req.user.district_id);
  }

  if (req.query.status) filter.status = req.query.status;

  const requests = await EnrollmentRequest.find(filter).sort({ created_at: -1 }).limit(50);

  // Populate school names
  const schoolIds = [...new Set(requests.map(r => r.school_id).filter(Boolean))];
  const schools   = schoolIds.length > 0 ? await School.find({ _id: { $in: schoolIds } }) : [];
  const schoolMap = Object.fromEntries(schools.map(s => [String(s._id || s.id), s]));

  const populated = requests.map(r => ({
    ...r.toObject(),
    school: schoolMap[String(r.school_id)] || null,
  }));

  res.json({ requests: populated });
};

// District Director / DCE reviews
exports.review = async (req, res) => {
  const { action, comment } = req.body;

  if (!['approved','rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or rejected' });
  }

  const request = await EnrollmentRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: `Already ${request.status}` });

  request.status          = action;
  request.reviewed_by     = String(req.user._id || req.user.id);
  request.reviewer_name   = req.user.name;
  request.reviewer_comment= comment || null;
  request.reviewed_at     = new Date();

  await request.save();

  // If approved — update school enrollment
  if (action === 'approved') {
    await School.findByIdAndUpdate(request.school_id, {
      enrolled: request.requested_enrolled,
    });
  }

  await AuditLog.create({
    _id:       newId('aud'),
    timestamp: nowISO(),
    user_id:   String(req.user._id || req.user.id),
    user_name: req.user.name,
    user_role: req.user.role,
    action:    `ENROLLMENT_REQUEST_${action.toUpperCase()}`,
    target:    request.school_id,
    details:   `${action}: ${request.current_enrolled} → ${request.requested_enrolled}. ${comment || ''}`,
    level:     'info',
  });

  res.json({ request });
};