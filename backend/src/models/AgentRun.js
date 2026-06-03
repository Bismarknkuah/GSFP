const {Schema,model}=require('mongoose');
module.exports=model('AgentRun',new Schema({
  _id:String,
  agent_name:String,
  agent_type:String,
  status:{type:String,enum:['running','completed','failed'],default:'running'},
  started_at:String,
  completed_at:{type:String,default:null},
  findings_count:{type:Number,default:0},
  alerts_created:{type:Number,default:0},
  summary:{type:String,default:null},
  error:{type:String,default:null},
  triggered_by:{type:String,default:'system'},
},{_id:false,versionKey:false}));
