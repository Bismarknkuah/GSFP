const {Schema,model}=require('mongoose');
module.exports=model('School',new Schema({
  _id:String, code:String, name:String, town:String,
  district_id:{type:String,ref:'District'}, region_id:{type:String,ref:'Region'},
  enrolled:{type:Number,default:0}, headmaster_id:{type:String,default:null},
  caterer_id:{type:String,default:null}, caterer2_id:{type:String,default:null},
  active:{type:Boolean,default:true}, created_at:String,
},{_id:false,versionKey:false}));
