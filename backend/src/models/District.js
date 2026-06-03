const {Schema,model}=require('mongoose');
module.exports=model('District',new Schema({
  _id:String, code:String, name:String, region_id:{type:String,ref:'Region'},
  capital:String, coordinator_id:{type:String,default:null}, director_id:{type:String,default:null},
  active:{type:Boolean,default:true}, created_at:String,
},{_id:false,versionKey:false}));
