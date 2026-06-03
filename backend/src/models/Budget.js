const {Schema,model}=require('mongoose');
module.exports=model('Budget',new Schema({
  _id:String, fiscal_year:String, term:String, level:{type:String,enum:['national','regional','district']},
  region_id:{type:String,default:null}, district_id:{type:String,default:null},
  total_amount:{type:Number,default:0}, allocated:{type:Number,default:0},
  disbursed:{type:Number,default:0}, balance:{type:Number,default:0},
  status:{type:String,default:'active',enum:['draft','active','closed']},
  created_by:String, notes:{type:String,default:null}, created_at:String,
},{_id:false,versionKey:false}));
