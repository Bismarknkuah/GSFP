const FoodTimetable    = require('../models/FoodTimetable');
const MenuConfirmation = require('../models/MenuConfirmation');
const { newId } = require('../utils/ids');

// DFC posts/updates monthly menu
exports.upsert = async (req, res) => {
  const { month, menu } = req.body;
  if (!month || !Array.isArray(menu) || menu.length === 0)
    return res.status(400).json({ error:'month and menu[] are required' });
  const district_id = String(req.user.district_id || '');
  if (!district_id) return res.status(400).json({ error:'No district assigned to your account' });

  const existing = await FoodTimetable.findOne({ district_id, month });
  if (existing) {
    existing.menu = menu; existing.updated_at = new Date();
    existing.posted_by = String(req.user._id||req.user.id); existing.posted_by_name = req.user.name;
    await existing.save();
    return res.json({ timetable:existing, updated:true });
  }
  const timetable = await FoodTimetable.create({
    _id:newId('ftt'), district_id, month, menu,
    posted_by:String(req.user._id||req.user.id), posted_by_name:req.user.name,
  });
  res.status(201).json({ timetable });
};

// View timetable (any district member)
exports.get = async (req, res) => {
  const district_id = String(req.query.district_id || req.user.district_id || '');
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const timetable = await FoodTimetable.findOne({ district_id, month });
  res.json({ timetable: timetable || null, month });
};

exports.list = async (req, res) => {
  const district_id = String(req.user.district_id || '');
  const timetables = await FoodTimetable.find({ district_id }).sort({ month:-1 }).limit(12);
  res.json({ timetables });
};

// What food is scheduled for a given date (helper)
const scheduledFor = (timetable, dateStr) => {
  if (!timetable) return null;
  const d = new Date(dateStr+'T00:00:00');
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  const weekNum = Math.ceil(d.getDate()/7);
  const items = (timetable.menu||[]).filter(m=>m.day===dayName && (m.week===0||m.week===weekNum));
  return items.length ? items.map(i=>i.food).join(' / ') : null;
};

// HEADMASTER: confirm whether scheduled food was served today
exports.confirm = async (req, res) => {
  if (req.user.role !== 'headmaster') return res.status(403).json({ error:'Headmaster only' });
  const { date, served_food, matched, comment } = req.body;
  const day = date || new Date().toISOString().slice(0,10);
  const district_id = String(req.user.district_id||'');
  const school_id   = String(req.user.school_id||'');

  const month     = day.slice(0,7);
  const timetable = await FoodTimetable.findOne({ district_id, month });
  const scheduled = scheduledFor(timetable, day);

  const existing = await MenuConfirmation.findOne({ school_id, date:day });
  if (existing) {
    existing.served_food = served_food || existing.served_food;
    existing.matched = matched !== undefined ? !!matched : existing.matched;
    existing.comment = comment || existing.comment;
    await existing.save();
    return res.json({ confirmation: existing, updated:true });
  }
  const confirmation = await MenuConfirmation.create({
    _id:newId('mcf'), district_id, school_id,
    headmaster_id:String(req.user._id||req.user.id), headmaster_name:req.user.name,
    date:day, scheduled_food:scheduled, served_food:served_food||scheduled,
    matched: matched !== undefined ? !!matched : true, comment:comment||'',
  });
  res.status(201).json({ confirmation });
};

// List confirmations — headmaster sees own school, officers see district
exports.confirmations = async (req, res) => {
  const filter = {};
  if (req.user.role === 'headmaster') filter.school_id = String(req.user.school_id||'');
  else if (req.user.district_id)      filter.district_id = String(req.user.district_id);
  if (req.query.month) filter.date = { $regex:`^${req.query.month}` };
  if (req.query.date)  filter.date = req.query.date;
  const confirmations = await MenuConfirmation.find(filter).sort({ date:-1 }).limit(200);
  res.json({ confirmations });
};

// Today's scheduled food for the requester's district (for headmaster card)
exports.todayMenu = async (req, res) => {
  const district_id = String(req.user.district_id||'');
  const day   = req.query.date || new Date().toISOString().slice(0,10);
  const month = day.slice(0,7);
  const timetable = await FoodTimetable.findOne({ district_id, month });
  res.json({ date:day, scheduled: scheduledFor(timetable, day) });
};