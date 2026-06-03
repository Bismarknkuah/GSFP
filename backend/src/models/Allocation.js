const {Schema,model}=require('mongoose');
module.exports=model('Allocation',new Schema({
  _id:String, budget_id:String, from_level:{type:String,enum:['national','regional']},
  to_level:{type:String,enum:['regional','district']},
  region_id:{type:String,default:null}, district_id:{type:String,default:null},
  amount:Number, purpose:{type:String,default:null},
  status:{type:String,default:'pending',enum:['pending','approved','disbursed','rejected']},
  approved_by:{type:String,default:null}, approved_at:{type:String,default:null},
  disbursed_at:{type:String,default:null}, reference:{type:String,default:null},
  created_by:String, notes:{type:String,default:null}, created_at:String,
},{_id:false,versionKey:false}));
