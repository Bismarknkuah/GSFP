const mongoose = require('mongoose');
const s = new mongoose.Schema({
  _id:        { type:String },
  caterer_id: { type:String, required:true },
  date:       { type:String, required:true },
  category:   { type:String, enum:['ingredients','fuel','transport','labour','equipment','other'], default:'ingredients' },
  item:       { type:String, required:true },
  amount:     { type:Number, required:true },
  notes:      { type:String },
  created_at: { type:Date, default:Date.now },
},{ _id:false });
s.index({ caterer_id:1, date:-1 });
module.exports = mongoose.models.Expenditure || mongoose.model('Expenditure', s);
