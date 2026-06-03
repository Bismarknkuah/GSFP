const {Schema,model}=require('mongoose');
module.exports=model('Region',new Schema({
  _id:String, code:String, name:String, capital:String, population:Number,
  coordinator_id:{type:String,default:null}, minister_id:{type:String,default:null},
  active:{type:Boolean,default:true}, created_at:String,
},{_id:false,versionKey:false}));
