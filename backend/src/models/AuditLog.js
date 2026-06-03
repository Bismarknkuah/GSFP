const {Schema,model}=require('mongoose');
module.exports=model('AuditLog',new Schema({_id:{type:String},timestamp:String,user_id:String,user_name:String,user_role:String,action:String,target:String,details:String,level:{type:String,default:'info'},ip:String},{_id:false,versionKey:false}));
