const {Schema,model}=require('mongoose');
module.exports=model('Message',new Schema({
  _id:String, sender_id:String, recipient:String, type:{type:String,enum:['direct','broadcast','circular','alert']},
  level:{type:String,enum:['school','district','regional','national'],default:'district'},
  subject:{type:String,default:null}, body:String,
  priority:{type:String,default:'normal',enum:['low','normal','high','urgent']},
  timestamp:String, read_by:{type:[String],default:[]}, attachments:{type:[String],default:[]},
},{_id:false,versionKey:false}));
