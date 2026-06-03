const {Schema,model}=require('mongoose');
module.exports=model('FAQ',new Schema({
  _id:String, question:String, answer:String,
  category:{type:String,default:'general'},
  keywords:{type:[String],default:[]},
  usage_count:{type:Number,default:0},
  helpful_count:{type:Number,default:0},
  created_by:String, active:{type:Boolean,default:true},
  created_at:String, updated_at:String,
},{_id:false,versionKey:false}));
