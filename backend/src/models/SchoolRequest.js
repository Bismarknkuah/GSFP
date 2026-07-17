const mongoose = require('mongoose');
const s = new mongoose.Schema({
  _id:              { type:String },
  name:             { type:String, required:true },
  code:             { type:String },
  town:             { type:String },
  enrolled:         { type:Number, default:0 },
  district_id:      { type:String },
  region_id:        { type:String },
  submitted_by:     { type:String },
  submitted_by_name:{ type:String },
  status:           { type:String, enum:['pending','approved','rejected'], default:'pending' },
  dce_id:           { type:String },
  dce_name:         { type:String },
  dce_comment:      { type:String },
  dce_decided_at:   { type:Date },
  reason:           { type:String },
  created_at:       { type:Date, default:Date.now },
},{ _id:false });
module.exports = mongoose.model('SchoolRequest', s);
