const SchoolRequest = require('../models/SchoolRequest');
const School        = require('../models/School');
const AuditLog      = require('../models/AuditLog');
const { newId, nowISO } = require('../utils/ids');

// District Coordinator submits new school request
exports.submit = async (req, res) => {
  const { name, town, enrolled, reason } = req.body;
  if (!name) return res.status(400).json({ error:'School name is required' });
  const request = new SchoolRequest({
    _id: newId('scr'), name, town: town||'', enrolled: Number(enrolled)||0,
    district_id: String(req.user.district_id||''),
    region_id:   String(req.user.region_id||''),
    submitted_by: String(req.user._id||req.user.id),
    submitted_by_name: req.user.name,
    reason: reason||'', status:'pending', created_at: new Date(),
  });
  await request.save();
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:String(req.user._id||req.user.id),
    user_name:req.user.name, user_role:req.user.role, action:'SCHOOL_REQUEST_SUBMITTED',
    target:'school', details:`New school request: ${name} (${town})`, level:'info' });
  res.status(201).json({ request });
};

// List school requests
exports.list = async (req, res) => {
  const filter = {};
  if (!['super_admin','national_admin','ceo','national_director'].includes(req.user.role)) {
    if (req.user.district_id) filter.district_id = String(req.user.district_id);
  }
  if (req.query.status) filter.status = req.query.status;
  const requests = await SchoolRequest.find(filter).sort({ created_at:-1 }).limit(50);
  res.json({ requests });
};

// DCE approves or rejects
exports.review = async (req, res) => {
  const { action, comment } = req.body;
  if (!['approved','rejected'].includes(action)) return res.status(400).json({ error:'action must be approved or rejected' });
  const request = await SchoolRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error:'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error:`Already ${request.status}` });

  request.status       = action;
  request.dce_id       = String(req.user._id||req.user.id);
  request.dce_name     = req.user.name;
  request.dce_comment  = comment||'';
  request.dce_decided_at = new Date();
  await request.save();

  // If approved — create the actual school
  if (action === 'approved') {
    const code = `SCH-${Date.now().toString().slice(-6)}`;
    await School.create({
      _id: newId('sch'), code, name:request.name, town:request.town,
      district_id:request.district_id, region_id:request.region_id,
      enrolled:request.enrolled, active:true, created_at:new Date(),
    });
  }

  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:String(req.user._id||req.user.id),
    user_name:req.user.name, user_role:req.user.role,
    action:`SCHOOL_REQUEST_${action.toUpperCase()}`, target:'school',
    details:`${action}: ${request.name}. ${comment||''}`, level:'info' });
  res.json({ request });
};
