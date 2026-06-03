const {Schema,model}=require('mongoose');
module.exports=model('NotificationLog',new Schema({
  _id:String, user_id:String, channel:{type:String,enum:['email','sms','push','in_app']},
  subject:{type:String,default:null}, body:String, recipient:String,
  status:{type:String,enum:['sent','failed','pending'],default:'pending'},
  error:{type:String,default:null}, sent_at:{type:String,default:null}, created_at:String,
},{_id:false,versionKey:false}));
