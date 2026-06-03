const bcrypt = require('bcryptjs');
const School = require('../models/School');
const User   = require('../models/User');
const { audit } = require('../utils/audit');
const { n } = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');

async function expand(s) {
  if (!s) return null;
  const [hm, cat, cat2] = await Promise.all([
    s.headmaster_id ? User.findOne({_id:s.headmaster_id}).select('-password_hash').lean() : null,
    s.caterer_id    ? User.findOne({_id:s.caterer_id   }).select('-password_hash').lean() : null,
    s.caterer2_id   ? User.findOne({_id:s.caterer2_id  }).select('-password_hash').lean() : null,
  ]);
  return n({ ...s, headmaster:hm, caterer:cat, caterer2:cat2 });
}

exports.list = async (req, res) => {
  const filter = { active:true };
  if (req.query.districtId) filter.district_id=req.query.districtId;
  if (req.query.regionId)   filter.region_id  =req.query.regionId;
  if (req.scopeDistrict)    filter.district_id =req.scopeDistrict;
  if (req.scopeRegion)      filter.region_id   =req.scopeRegion;
  if (req.scopeSchool)      filter._id          =req.scopeSchool;
  const schools = await School.find(filter).sort({ code:1 }).lean();
  res.json({ schools: await Promise.all(schools.map(expand)) });
};

exports.get = async (req, res) => {
  const s = await School.findOne({ _id:req.params.id }).lean();
  if (!s) return res.status(404).json({ error:'School not found' });
  res.json({ school: await expand(s) });
};

exports.create = async (req, res) => {
  const { code, name, town, enrolled, districtId, regionId, headmaster, caterer, caterer2 } = req.body||{};
  if (!code||!name||!town||!enrolled||!districtId) return res.status(400).json({ error:'code, name, town, enrolled and districtId required' });
  if (!headmaster?.username||!caterer?.username) return res.status(400).json({ error:'Headmaster and caterer credentials required' });
  const schoolId=newId('sch'), now=nowISO();
  const hmId=newId('usr'), catId=newId('usr');
  const users=[
    { _id:hmId,  username:headmaster.username, password_hash:bcrypt.hashSync(headmaster.password||'head123',10), role:'headmaster', name:headmaster.name, phone:headmaster.phone||null, region_id:regionId||null, district_id:districtId, school_id:schoolId, active:true, created_at:now },
    { _id:catId, username:caterer.username,    password_hash:bcrypt.hashSync(caterer.password||'cat123',10),     role:'caterer',    name:caterer.name,    phone:caterer.phone||null,    region_id:regionId||null, district_id:districtId, school_id:schoolId, rate_per_student:caterer.rate||1.20, active:true, created_at:now },
  ];
  let cat2Id=null;
  if (caterer2?.username) { cat2Id=newId('usr'); users.push({ _id:cat2Id, username:caterer2.username, password_hash:bcrypt.hashSync(caterer2.password||'cat123',10), role:'caterer', name:caterer2.name, phone:caterer2.phone||null, region_id:regionId||null, district_id:districtId, school_id:schoolId, rate_per_student:caterer.rate||1.20, active:true, created_at:now }); }
  await User.insertMany(users);
  await School.create({ _id:schoolId, code:code.toUpperCase().trim(), name:name.trim(), town:town.trim(), district_id:districtId, region_id:regionId||null, enrolled:Number(enrolled), headmaster_id:hmId, caterer_id:catId, caterer2_id:cat2Id, active:true, created_at:now });
  await audit({ user:req.user, action:'SCHOOL_ENROLLED', target:schoolId, details:`${name} (${code})` });
  res.status(201).json({ school: await expand(await School.findOne({_id:schoolId}).lean()) });
};

exports.update = async (req, res) => {
  const { name, town, enrolled, active } = req.body||{};
  const s = await School.findOne({ _id:req.params.id });
  if (!s) return res.status(404).json({ error:'School not found' });
  if (name!==undefined)    s.name=name;
  if (town!==undefined)    s.town=town;
  if (enrolled!==undefined)s.enrolled=Number(enrolled);
  if (active!==undefined)  s.active=active;
  await s.save();
  await audit({ user:req.user, action:'SCHOOL_UPDATED', target:req.params.id });
  res.json({ school: await expand(await School.findOne({_id:req.params.id}).lean()) });
};

exports.remove = async (req, res) => {
  await School.updateOne({ _id:req.params.id }, { active:false });
  await audit({ user:req.user, action:'SCHOOL_DEACTIVATED', target:req.params.id });
  res.json({ ok:true });
};
