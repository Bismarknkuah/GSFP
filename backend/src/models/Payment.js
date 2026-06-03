const {Schema,model}=require('mongoose');
module.exports=model('Payment',new Schema({
  _id:String, caterer_id:String, district_id:String, region_id:String,
  period:String, meals_served:{type:Number,default:0},
  days_covered:{type:Number,default:0}, days_paid:{type:Number,default:0},
  days_arrears:{type:Number,default:0}, rate_per_student:{type:Number,default:1.20},
  amount_paid:{type:Number,default:0}, arrears_amount:{type:Number,default:0},
  status:{type:String,default:'partial',enum:['fully-paid','partial','pending','arrears']},
  last_payment_date:{type:String,default:null}, source:{type:String,default:'National Government'},
  reference:{type:String,default:null}, notes:{type:String,default:null},
  caterer_reported:{type:Boolean,default:false}, received_amount:{type:Number,default:0},
  received_date:{type:String,default:null}, co_approval_required:{type:Boolean,default:false},
  co_approved:{type:Boolean,default:null}, co_approved_by:{type:String,default:null},
  co_approved_at:{type:String,default:null}, visible_to_oversight:{type:Boolean,default:true},
  approved_by:{type:String,default:null}, approved_at:{type:String,default:null},
  payment_voucher:{type:String,default:null}, created_at:String,
},{_id:false,versionKey:false}));
