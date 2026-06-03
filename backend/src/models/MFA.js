const {Schema,model}=require('mongoose');
module.exports=model('MFA',new Schema({
  _id:String, user_id:{type:String,unique:true}, secret:String,
  method:{type:String,enum:['totp','email','sms'],default:'email'},
  enabled:{type:Boolean,default:false}, backup_codes:{type:[String],default:[]},
  verified_at:{type:String,default:null}, created_at:String,
},{_id:false,versionKey:false}));
