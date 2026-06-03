const {Schema,model}=require('mongoose');
const {ROLES}=require('../utils/permissions');
module.exports=model('User',new Schema({
  _id:String, username:{type:String,unique:true}, password_hash:String,
  role:{type:String,enum:ROLES}, name:String, phone:{type:String,default:null},
  email:{type:String,default:null}, title:{type:String,default:null},
  region_id:{type:String,default:null}, district_id:{type:String,default:null},
  school_id:{type:String,default:null}, rate_per_student:{type:Number,default:2.00},
  profile_picture:{type:String,default:null},
  mfa_enabled:{type:Boolean,default:false}, last_login:{type:String,default:null},
  active:{type:Boolean,default:true}, created_at:String,
},{_id:false,versionKey:false}));
