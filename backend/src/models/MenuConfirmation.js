const mongoose = require('mongoose');
const s = new mongoose.Schema({
  _id:            { type:String },
  district_id:    { type:String, required:true },
  school_id:      { type:String, required:true },
  headmaster_id:  { type:String, required:true },
  headmaster_name:{ type:String },
  date:           { type:String, required:true },      // "2026-07-19"
  scheduled_food: { type:String },                     // what the timetable said
  served_food:    { type:String },                     // what was actually served
  matched:        { type:Boolean, default:true },      // tick = served as scheduled
  comment:        { type:String },
  created_at:     { type:Date, default:Date.now },
},{ _id:false });
s.index({ school_id:1, date:1 }, { unique:true });
module.exports = mongoose.models.MenuConfirmation || mongoose.model('MenuConfirmation', s);