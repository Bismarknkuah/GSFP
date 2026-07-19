const mongoose = require('mongoose');
const s = new mongoose.Schema({
  _id:         { type:String },
  district_id: { type:String, required:true },
  month:       { type:String, required:true },
  menu:        [{
    _id:false,
    day:  { type:String, enum:['Monday','Tuesday','Wednesday','Thursday','Friday'], required:true },
    week: { type:Number, default:0 },
    food: { type:String, required:true },
    notes:{ type:String },
  }],
  posted_by:      { type:String },
  posted_by_name: { type:String },
  created_at:     { type:Date, default:Date.now },
  updated_at:     { type:Date, default:Date.now },
},{ _id:false });
s.index({ district_id:1, month:1 }, { unique:true });
module.exports = mongoose.models.FoodTimetable || mongoose.model('FoodTimetable', s);
