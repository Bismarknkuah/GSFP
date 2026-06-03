const {Schema,model}=require('mongoose');
module.exports=model('Notification',new Schema({
  _id:String, user_id:String, type:String, title:String, body:String,
  link:{type:String,default:null}, read:{type:Boolean,default:false},
  created_at:String,
},{_id:false,versionKey:false}));
