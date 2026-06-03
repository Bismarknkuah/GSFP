const {Schema,model}=require('mongoose');
module.exports=model('Report',new Schema({
  _id:String, caterer_id:String, school_id:String, district_id:String, region_id:String,
  date:String, food_type:String, students_fed:{type:Number,default:0},
  time_ready:{type:String,default:null}, time_served:{type:String,default:null},
  notes:{type:String,default:null}, image_path:{type:String,default:null},
  status:{type:String,default:'pending',enum:['pending','approved','rejected','archived','forwarded_regional','forwarded_national']},
  headmaster_comment:{type:String,default:null}, reviewed_by:{type:String,default:null}, reviewed_at:{type:String,default:null},
  regional_status:{type:String,default:null}, regional_reviewed_by:{type:String,default:null}, regional_reviewed_at:{type:String,default:null},
  forwarded:{type:Boolean,default:false}, submitted_at:String, is_resubmission:{type:Boolean,default:false},
},{_id:false,versionKey:false}));
