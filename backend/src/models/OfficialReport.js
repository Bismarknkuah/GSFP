const {Schema,model}=require('mongoose');
const ChainEntry=new Schema({
  level:String, actor_id:String, actor_name:String, actor_role:String,
  action:{type:String,enum:['submitted','received','commented','approved','rejected','forwarded','escalated']},
  comment:{type:String,default:null}, analysis:{type:String,default:null},
  timestamp:String,
},{_id:false});
module.exports=model('OfficialReport',new Schema({
  _id:String,
  reference:String,
  report_type:{type:String,enum:['daily','weekly','monthly','term','annual','special','audit','financial','monitoring'],default:'monthly'},
  subject:String,
  content:String,
  period:String,
  attachments:{type:[String],default:[]},
  // Originator
  submitted_by:String, submitted_by_name:String, submitted_by_role:String, submitted_at:String,
  // Scope
  district_id:{type:String,default:null}, region_id:{type:String,default:null},
  // Workflow routing
  current_holder:String,           // user_id of who currently holds it
  current_holder_role:String,      // role of current holder
  current_level:{type:String,enum:['district','dce','regional','regional_minister','national_director','ceo','national_auditor'],default:'district'},
  origin_level:String,
  // Chain
  chain:{type:[ChainEntry],default:[]},
  // Stats for auditors
  total_meals:{type:Number,default:0},
  total_paid:{type:Number,default:0},
  total_arrears:{type:Number,default:0},
  schools_count:{type:Number,default:0},
  compliance_rate:{type:Number,default:0},
  // Status
  status:{type:String,default:'pending',enum:['pending','with_dce','with_rfc','with_national','with_ceo','approved_final','rejected']},
  rejected_at_level:{type:String,default:null},
  rejection_reason:{type:String,default:null},
  created_at:String, updated_at:String,
},{_id:false,versionKey:false}));
