const FoodTimetable = require('../models/FoodTimetable');
const { newId } = require('../utils/ids');

// DFC posts/updates monthly menu for their district
exports.upsert = async (req, res) => {
  const { month, menu } = req.body;
  if (!month || !Array.isArray(menu) || menu.length === 0)
    return res.status(400).json({ error:'month and menu[] are required' });
  const district_id = String(req.user.district_id || '');
  if (!district_id) return res.status(400).json({ error:'No district assigned to your account' });

  const existing = await FoodTimetable.findOne({ district_id, month });
  if (existing) {
    existing.menu = menu;
    existing.updated_at = new Date();
    existing.posted_by = String(req.user._id || req.user.id);
    existing.posted_by_name = req.user.name;
    await existing.save();
    return res.json({ timetable: existing, updated:true });
  }
  const timetable = await FoodTimetable.create({
    _id:newId('ftt'), district_id, month, menu,
    posted_by:String(req.user._id||req.user.id), posted_by_name:req.user.name,
  });
  res.status(201).json({ timetable });
};

// Anyone in the district (caterer, headmaster, officers) can view
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
