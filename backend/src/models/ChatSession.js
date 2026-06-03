const {Schema,model}=require('mongoose');
module.exports=model('ChatSession',new Schema({
  _id:String, user_id:String, user_name:String, user_role:String,
  messages:[{
    role:{type:String,enum:['user','assistant','admin']},
    content:String, timestamp:String,
    faq_id:{type:String,default:null},
    is_pending:{type:Boolean,default:false},
  }],
  status:{type:String,default:'active',enum:['active','resolved','pending_admin']},
  pending_question:{type:String,default:null},
  created_at:String, updated_at:String,
},{_id:false,versionKey:false}));
