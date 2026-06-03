const Region   = require('../models/Region');
const District = require('../models/District');
const { audit } = require('../utils/audit');
const { n } = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');
const { GHANA_REGIONS } = require('../utils/permissions');

exports.list = async (req, res) => {
  const filter = {};
  if (req.scopeRegion) filter._id = req.scopeRegion;
  const regions = await Region.find(filter).sort({ name:1 }).lean();
  const enriched = await Promise.all(regions.map(async r => {
    const districtCount = await District.countDocuments({ region_id:r._id, active:true });
    return n({ ...r, district_count:districtCount });
  }));
  res.json({ regions: enriched });
};

exports.get = async (req, res) => {
  const r = await Region.findOne({ _id:req.params.id }).lean();
  if (!r) return res.status(404).json({ error:'Region not found' });
  res.json({ region: n(r) });
};

exports.create = async (req, res) => {
  const { name, code, capital } = req.body||{};
  if (!name||!code) return res.status(400).json({ error:'name and code required' });
  const exists = await Region.findOne({ code:code.toUpperCase().trim() });
  if (exists) return res.status(409).json({ error:'Region code already in use' });
  const id = newId('rgn');
  await Region.create({ _id:id, code:code.toUpperCase().trim(), name:name.trim(), capital:capital||null, active:true, created_at:nowISO() });
  await audit({ user:req.user, action:'REGION_CREATED', target:id, details:name });
  res.status(201).json({ region: n(await Region.findOne({_id:id}).lean()) });
};

exports.update = async (req, res) => {
  const { name, capital, active, coordinator_id, minister_id } = req.body||{};
  const r = await Region.findOne({ _id:req.params.id });
  if (!r) return res.status(404).json({ error:'Region not found' });
  if (name!==undefined)           r.name=name;
  if (capital!==undefined)        r.capital=capital;
  if (active!==undefined)         r.active=active;
  if (coordinator_id!==undefined) r.coordinator_id=coordinator_id;
  if (minister_id!==undefined)    r.minister_id=minister_id;
  await r.save();
  await audit({ user:req.user, action:'REGION_UPDATED', target:req.params.id });
  res.json({ region: n(await Region.findOne({_id:req.params.id}).lean()) });
};

exports.ghanaRegions = (_req, res) => res.json({ regions: GHANA_REGIONS });
