const District = require('../models/District');
const School   = require('../models/School');
const User     = require('../models/User');
const { audit } = require('../utils/audit');
const { n } = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.regionId) filter.region_id = req.query.regionId;
  if (req.scopeRegion)    filter.region_id = req.scopeRegion;
  if (req.scopeDistrict)  filter._id = req.scopeDistrict;
  const districts = await District.find(filter).sort({ name:1 }).lean();
  const enriched = await Promise.all(districts.map(async d => {
    const [schools, users] = await Promise.all([
      School.countDocuments({ district_id:d._id, active:true }),
      User.countDocuments({ district_id:d._id, active:true }),
    ]);
    return n({ ...d, school_count:schools, user_count:users });
  }));
  res.json({ districts: enriched });
};

exports.create = async (req, res) => {
  const { name, code, region_id, capital } = req.body||{};
  if (!name||!code||!region_id) return res.status(400).json({ error:'name, code and region_id required' });
  const exists = await District.findOne({ code:code.toUpperCase().trim() });
  if (exists) return res.status(409).json({ error:'District code already in use' });
  const id = newId('dst');
  await District.create({ _id:id, code:code.toUpperCase().trim(), name:name.trim(), region_id, capital:capital||null, active:true, created_at:nowISO() });
  await audit({ user:req.user, action:'DISTRICT_CREATED', target:id, details:name });
  res.status(201).json({ district: n(await District.findOne({_id:id}).lean()) });
};

exports.update = async (req, res) => {
  const { name, capital, active, coordinator_id, director_id } = req.body||{};
  const d = await District.findOne({ _id:req.params.id });
  if (!d) return res.status(404).json({ error:'District not found' });
  if (name!==undefined)           d.name=name;
  if (capital!==undefined)        d.capital=capital;
  if (active!==undefined)         d.active=active;
  if (coordinator_id!==undefined) d.coordinator_id=coordinator_id;
  if (director_id!==undefined)    d.director_id=director_id;
  await d.save();
  await audit({ user:req.user, action:'DISTRICT_UPDATED', target:req.params.id });
  res.json({ district: n(await District.findOne({_id:req.params.id}).lean()) });
};

exports.remove = async (req, res) => {
  await District.updateOne({ _id:req.params.id }, { active:false });
  await audit({ user:req.user, action:'DISTRICT_DEACTIVATED', target:req.params.id });
  res.json({ ok:true });
};
