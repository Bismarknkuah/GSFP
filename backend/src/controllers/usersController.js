const bcrypt = require('bcryptjs');
const User   = require('../models/User');
const { audit } = require('../utils/audit');
const { n } = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');
const { ROLES, ROLE_LABELS, NATIONAL_ROLES, REGIONAL_ROLES } = require('../utils/permissions');

exports.list = async (req, res) => {
  const { role, regionId, districtId, q, active } = req.query;
  const filter = {};
  if (role)       filter.role       = role;
  if (regionId)   filter.region_id  = regionId;
  if (districtId) filter.district_id= districtId;
  if (active!==undefined) filter.active = active==='true';
  if (q) filter.$or = [{ name:{$regex:q,$options:'i'} },{ username:{$regex:q,$options:'i'} }];
  // Scope enforcement
  if (req.scopeRegion)   filter.region_id  = req.scopeRegion;
  if (req.scopeDistrict) filter.district_id= req.scopeDistrict;
  const users = await User.find(filter).select('-password_hash').sort({ role:1, name:1 }).lean();
  res.json({ users: users.map(n) });
};

exports.get = async (req, res) => {
  const u = await User.findOne({ _id:req.params.id }).select('-password_hash').lean();
  if (!u) return res.status(404).json({ error:'User not found' });
  res.json({ user: n(u) });
};

exports.create = async (req, res) => {
  const { username, password, role, name, phone, email, title, regionId, districtId, schoolId, ratePerStudent } = req.body||{};
  if (!username||!password||!role||!name) return res.status(400).json({ error:'username, password, role and name required' });
  if (!ROLES.includes(role)) return res.status(400).json({ error:'Invalid role' });
  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error:'Username already taken' });
  const id = newId('usr');
  await User.create({ _id:id, username, password_hash:bcrypt.hashSync(password,10), role, name, phone:phone||null, email:email||null, title:title||null, region_id:regionId||null, district_id:districtId||null, school_id:schoolId||null, rate_per_student:ratePerStudent||null, active:true, created_at:nowISO() });
  await audit({ user:req.user, action:'USER_CREATED', target:id, details:`${name} (${role})` });
  res.status(201).json({ user: n(await User.findOne({_id:id}).select('-password_hash').lean()) });
};

exports.update = async (req, res) => {
  const { name, phone, email, title, active, password, regionId, districtId, schoolId, ratePerStudent } = req.body||{};
  const u = await User.findOne({ _id:req.params.id });
  if (!u) return res.status(404).json({ error:'User not found' });
  if (name!==undefined)          u.name=name;
  if (phone!==undefined)         u.phone=phone;
  if (email!==undefined)         u.email=email;
  if (title!==undefined)         u.title=title;
  if (active!==undefined)        u.active=active;
  if (regionId!==undefined)      u.region_id=regionId;
  if (districtId!==undefined)    u.district_id=districtId;
  if (schoolId!==undefined)      u.school_id=schoolId;
  if (ratePerStudent!==undefined)u.rate_per_student=ratePerStudent;
  if (password&&password.length>=6) u.password_hash=bcrypt.hashSync(password,10);
  await u.save();
  await audit({ user:req.user, action:'USER_UPDATED', target:req.params.id, details:u.name });
  res.json({ user: n(await User.findOne({_id:req.params.id}).select('-password_hash').lean()) });
};

exports.remove = async (req, res) => {
  if (req.params.id===req.user._id) return res.status(400).json({ error:'Cannot delete your own account' });
  await User.deleteOne({ _id:req.params.id });
  await audit({ user:req.user, action:'USER_DELETED', target:req.params.id });
  res.json({ ok:true });
};

exports.deactivate = async (req, res) => {
  await User.updateOne({ _id:req.params.id }, { active:false });
  await audit({ user:req.user, action:'USER_DEACTIVATED', target:req.params.id });
  res.json({ ok:true });
};

exports.reactivate = async (req, res) => {
  await User.updateOne({ _id:req.params.id }, { active:true });
  await audit({ user:req.user, action:'USER_REACTIVATED', target:req.params.id });
  res.json({ ok:true });
};

exports.roles = (_req, res) => res.json({ roles: ROLES.map(r=>({ value:r, label:ROLE_LABELS[r] })) });
