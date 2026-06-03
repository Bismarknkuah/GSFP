const {Schema,model}=require('mongoose');
module.exports=model('PendingQuestion',new Schema({
  _id:String, user_id:String, user_name:String, user_role:String,
  question:String, answer:{type:String,default:null},
  answered_by:{type:String,default:null}, answered_at:{type:String,default:null},
  status:{type:String,default:'pending',enum:['pending','answered','dismissed']},
  auto_faq:{type:Boolean,default:false}, faq_id:{type:String,default:null},
  created_at:String,
},{_id:false,versionKey:false}));
