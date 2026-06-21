const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id:               { type: String },
  school_id:         { type: String, required: true },
  headmaster_id:     { type: String, required: true },
  headmaster_name:   { type: String },
  current_enrolled:  { type: Number, required: true },
  requested_enrolled:{ type: Number, required: true },
  change_type:       { type: String, enum: ['admission','withdrawal','correction'], required: true },
  reason:            { type: String, required: true },
  notes:             { type: String },
  status:            { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  reviewed_by:       { type: String },
  reviewer_name:     { type: String },
  reviewer_comment:  { type: String },
  reviewed_at:       { type: Date },
  district_id:       { type: String },
  region_id:         { type: String },
  created_at:        { type: Date, default: Date.now },
}, { _id: false });

module.exports = mongoose.model('EnrollmentRequest', schema);