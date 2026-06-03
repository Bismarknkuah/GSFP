const Report   = require('../models/Report');
const School   = require('../models/School');
const User     = require('../models/User');
const Payment  = require('../models/Payment');
const District = require('../models/District');
const Region   = require('../models/Region');
const { n }    = require('../utils/normalize');

const monthStart = () => new Date().toISOString().slice(0,7)+'-01';
const today      = ()  => new Date().toISOString().split('T')[0];
const dAgo       = (n) => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; };

exports.overview = async (req, res) => {
  try {
    const rFilter={}, pFilter={};
    if (req.scopeDistrict){ rFilter.district_id=req.scopeDistrict; pFilter.district_id=req.scopeDistrict; }
    if (req.scopeRegion)  { rFilter.region_id  =req.scopeRegion;   pFilter.region_id  =req.scopeRegion; }
    if (req.user?.school_id) rFilter.school_id = req.user.school_id;

    const [schoolCount,catCount,statusAgg,mealsAgg,trend,payAgg,districtCount,regionCount] = await Promise.all([
      School.countDocuments({ active:true, ...(req.scopeDistrict?{district_id:req.scopeDistrict}:req.scopeRegion?{region_id:req.scopeRegion}:{}) }),
      User.countDocuments({ role:'caterer', active:true, ...(req.scopeDistrict?{district_id:req.scopeDistrict}:{}) }),
      Report.aggregate([{$match:rFilter},{$group:{_id:'$status',count:{$sum:1}}}]),
      Report.aggregate([{$match:{...rFilter,status:'approved'}},{$group:{_id:null,total:{$sum:'$students_fed'},month:{$sum:{$cond:[{$gte:['$date',monthStart()]},'$students_fed',0]}},tod:{$sum:{$cond:[{$eq:['$date',today()]},'$students_fed',0]}}}}]),
      Report.aggregate([{$match:{...rFilter,status:'approved',date:{$gte:dAgo(30)}}},{$group:{_id:'$date',meals:{$sum:'$students_fed'},reports:{$sum:1}}},{$sort:{_id:1}},{$project:{date:'$_id',meals:1,reports:1,_id:0}}]),
      Payment.aggregate([{$match:pFilter},{$group:{_id:null,total_paid:{$sum:'$amount_paid'},total_arrears:{$sum:'$arrears_amount'},records:{$sum:1}}}]),
      District.countDocuments({ active:true }),
      Region.countDocuments({ active:true }),
    ]);

    const sm  = Object.fromEntries(statusAgg.map(s=>[s._id,s.count]));
    const mm  = mealsAgg[0] || { total:0, month:0, tod:0 };
    const pm  = payAgg[0]   || { total_paid:0, total_arrears:0, records:0 };

    res.json({
      counters:{
        schools:schoolCount, caterers:catCount,
        districts:districtCount, regions:regionCount,
        pending_reports:sm.pending||0, approved_reports:sm.approved||0, rejected_reports:sm.rejected||0,
        meals_all_time:mm.total, meals_this_month:mm.month, meals_today:mm.tod,
        total_paid:pm.total_paid, total_arrears:pm.total_arrears, payment_records:pm.records,
      },
      trend,
    });
  } catch(err) {
    console.error('[analytics/overview]', err.message);
    res.json({ counters:{schools:0,caterers:0,districts:0,regions:0,pending_reports:0,approved_reports:0,rejected_reports:0,meals_all_time:0,meals_this_month:0,meals_today:0,total_paid:0,total_arrears:0,payment_records:0}, trend:[] });
  }
};

exports.regional = async (req, res) => {
  try {
    const rid = req.params.regionId || req.scopeRegion;
    if (!rid) return res.json({ districts:[] });
    const districts = await District.find({ region_id:rid }).lean();
    const data = await Promise.all(districts.map(async d => {
      const [reports, schools, caterers] = await Promise.all([
        Report.aggregate([{$match:{district_id:d._id,status:'approved'}},{$group:{_id:null,meals:{$sum:'$students_fed'},count:{$sum:1}}}]),
        School.countDocuments({district_id:d._id,active:true}),
        User.countDocuments({district_id:d._id,role:'caterer',active:true}),
      ]);
      return n({ ...d, approved_reports:reports[0]?.count||0, meals:reports[0]?.meals||0, schools, caterers });
    }));
    res.json({ districts: data });
  } catch(err) { console.error('[analytics/regional]',err.message); res.json({ districts:[] }); }
};

exports.monthly = async (req, res) => {
  try {
    const filter = {};
    if (req.scopeDistrict) filter.district_id=req.scopeDistrict;
    if (req.scopeRegion)   filter.region_id  =req.scopeRegion;
    const monthly = await Report.aggregate([
      {$match:{...filter,status:'approved'}},
      {$group:{_id:{$substr:['$date',0,7]},meals:{$sum:'$students_fed'},reports:{$sum:1}}},
      {$sort:{_id:1}}, {$project:{month:'$_id',meals:1,reports:1,_id:0}},
    ]);
    res.json({ monthly });
  } catch(err) { console.error('[analytics/monthly]',err.message); res.json({ monthly:[] }); }
};

exports.caterers = async (req, res) => {
  try {
    const filter = {};
    if (req.scopeDistrict) filter.district_id=req.scopeDistrict;
    if (req.scopeRegion)   filter.region_id  =req.scopeRegion;
    const rankings = await Report.aggregate([{$match:filter},{$group:{_id:'$caterer_id',approved:{$sum:{$cond:[{$eq:['$status','approved']},1,0]}},pending:{$sum:{$cond:[{$eq:['$status','pending']},1,0]}},meals:{$sum:{$cond:[{$eq:['$status','approved']},'$students_fed',0]}}}}]);
    const cats = await User.find({_id:{$in:rankings.map(r=>r._id)}}).select('-password_hash').lean();
    const catMap = Object.fromEntries(cats.map(c=>[c._id,c]));
    res.json({ caterers: rankings.map(r=>n({...r,caterer_id:r._id,...catMap[r._id]})).sort((a,b)=>b.meals-a.meals) });
  } catch(err) { console.error('[analytics/caterers]',err.message); res.json({ caterers:[] }); }
};

exports.nationalSummary = async (req, res) => {
  try {
    const [sc,dc,rc,uc,cc,repAgg,payAgg,monthly] = await Promise.all([
      School.countDocuments({active:true}),
      District.countDocuments({active:true}),
      Region.countDocuments({active:true}),
      User.countDocuments({active:true}),
      User.countDocuments({role:'caterer',active:true}),
      Report.aggregate([{$group:{_id:'$status',count:{$sum:1},meals:{$sum:{$cond:[{$eq:['$status','approved']},'$students_fed',0]}}}}]),
      Payment.aggregate([{$group:{_id:null,paid:{$sum:'$amount_paid'},arrears:{$sum:'$arrears_amount'}}}]),
      Report.aggregate([{$match:{status:'approved'}},{$group:{_id:{$substr:['$date',0,7]},meals:{$sum:'$students_fed'},reports:{$sum:1}}},{$sort:{_id:-1}},{$limit:12},{$project:{month:'$_id',meals:1,reports:1,_id:0}}]),
    ]);
    const sm = Object.fromEntries(repAgg.map(r=>[r._id,{count:r.count,meals:r.meals}]));
    res.json({ schools:sc,districts:dc,regions:rc,users:uc,caterers:cc, approved:sm.approved?.count||0, pending:sm.pending?.count||0, rejected:sm.rejected?.count||0, total_meals:sm.approved?.meals||0, payments:payAgg[0]||{paid:0,arrears:0}, monthly:monthly.reverse() });
  } catch(err) { console.error('[analytics/national]',err.message); res.json({ schools:0,districts:0,regions:0,users:0,caterers:0,approved:0,pending:0,rejected:0,total_meals:0,payments:{paid:0,arrears:0},monthly:[] }); }
};
