const {Schema,model}=require('mongoose');
module.exports=model('Disbursement',new Schema({
  _id:String,
  reference:String,
  fiscal_year:String,
  term:String,
  level:{type:String,enum:['regional','district','caterer']},
  region_id:{type:String,default:null},
  district_id:{type:String,default:null},
  caterer_id:{type:String,default:null},
  recipient_name:String,
  amount:Number,
  purpose:String,
  payment_method:{type:String,default:'Bank Transfer'},
  bank_name:{type:String,default:null},
  account_number:{type:String,default:null},
  // Workflow states
  status:{type:String,default:'pending_ceo',enum:['pending_ceo','ceo_approved','ceo_rejected','disbursed','cancelled']},
  // Creation
  created_by:String,
  created_by_name:String,
  created_by_role:String,
  created_at:String,
  // CEO approval
  ceo_id:{type:String,default:null},
  ceo_name:{type:String,default:null},
  ceo_decision_at:{type:String,default:null},
  ceo_comment:{type:String,default:null},
  // Disbursement execution
  disbursed_by:{type:String,default:null},
  disbursed_at:{type:String,default:null},
  disbursement_reference:{type:String,default:null},
  // Linked budget
  budget_id:{type:String,default:null},
  allocation_id:{type:String,default:null},
  notes:{type:String,default:null},
},{_id:false,versionKey:false}));
