const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id:              { type:String },
  scope:            { type:String, enum:['reports','payments','reports_payments','all'], required:true },
  scope_label:      { type:String },
  requested_by:     { type:String, required:true },
  requested_by_name:{ type:String },
  reason:           { type:String, required:true },
  status:           { type:String, enum:['pending_ceo','pending_natdir','dual_approved','rejected','executed'], default:'pending_ceo' },
  // CEO approval
  ceo_id:           { type:String },
  ceo_name:         { type:String },
  ceo_approved:     { type:Boolean, default:false },
  ceo_comment:      { type:String },
  ceo_decided_at:   { type:Date },
  // National Director approval
  natdir_id:        { type:String },
  natdir_name:      { type:String },
  natdir_approved:  { type:Boolean, default:false },
  natdir_comment:   { type:String },
  natdir_decided_at:{ type:Date },
  // Execution
  executed_by:      { type:String },
  executed_at:      { type:Date },
  deleted_counts:   { type:mongoose.Schema.Types.Mixed },
  // Rejection
  rejected_by:      { type:String },
  rejected_by_name: { type:String },
  rejected_at:      { type:Date },
  reject_reason:    { type:String },
  created_at:       { type:Date, default:Date.now },
  expires_at:       { type:Date },
}, { _id:false });
module.exports = mongoose.model('ResetRequest', schema);
