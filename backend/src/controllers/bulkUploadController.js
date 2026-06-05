const { parse } = require('csv-parse/sync');
const bcrypt    = require('bcryptjs');
const School    = require('../models/School');
const Report    = require('../models/Report');
const Payment   = require('../models/Payment');
const User      = require('../models/User');
const { newId, nowISO, daysAgoISO } = require('../utils/ids');

const parseCSV = (buffer) => parse(buffer, { columns:true, skip_empty_lines:true, trim:true });

// Upload payments
exports.uploadPayments = async (req, res) => {
  const rows   = parseCSV(req.file.buffer);
  let inserted=0, errors=0, errorDetails=[];
  for (const row of rows) {
    try {
      const school = await School.findOne({ code: row.school_code });
      if (!school) { errors++; errorDetails.push(`School not found: ${row.school_code}`); continue; }
      const caterer = await User.findOne({ username: row.caterer_username });
      const covered = Number(row.days_covered)||0;
      const paid    = Number(row.days_paid)||0;
      const arrears = covered - paid;
      const rate    = 2.00;
      await Payment.create({
        _id:newId('pay'), caterer_id:caterer?._id||row.caterer_username,
        school_id:school._id, district_id:school.district_id, region_id:school.region_id,
        period:row.period, days_covered:covered, days_paid:paid, days_arrears:arrears,
        rate_per_student:rate, amount_paid:Number(row.amount_paid)||paid*school.enrolled*rate,
        arrears_amount:arrears*school.enrolled*rate, status:arrears===0?'fully-paid':'partial',
        last_payment_date:row.payment_date||nowISO(), reference:row.reference||'',
        source:'Bulk Upload', created_at:nowISO(),
      });
      inserted++;
    } catch(e) { errors++; errorDetails.push(`Row error: ${e.message}`); }
  }
  res.json({ ok:true, processed:rows.length, inserted, errors, error_details:errorDetails.slice(0,10) });
};

// Upload feeding reports
exports.uploadReports = async (req, res) => {
  const rows = parseCSV(req.file.buffer);
  let inserted=0, errors=0, errorDetails=[];
  for (const row of rows) {
    try {
      const school  = await School.findOne({ code: row.school_code });
      if (!school) { errors++; errorDetails.push(`School not found: ${row.school_code}`); continue; }
      const caterer = await User.findOne({ username: row.caterer_username });
      await Report.create({
        _id:newId('rep'), caterer_id:caterer?._id||row.caterer_username,
        school_id:school._id, district_id:school.district_id, region_id:school.region_id,
        date:row.date, food_type:row.food_type, students_fed:Number(row.students_fed)||0,
        time_ready:row.time_ready||null, time_served:row.time_served||null,
        notes:row.notes||null, status:row.status||'approved',
        headmaster_comment:row.headmaster_comment||null,
        forwarded:row.status==='approved', submitted_at:row.date+'T12:00:00.000Z',
        created_at:nowISO(),
      });
      inserted++;
    } catch(e) { errors++; errorDetails.push(`Row error: ${e.message}`); }
  }
  res.json({ ok:true, processed:rows.length, inserted, errors, error_details:errorDetails.slice(0,10) });
};

// Upload schools
exports.uploadSchools = async (req, res) => {
  const rows = parseCSV(req.file.buffer);
  const District = require('../models/District');
  let inserted=0, errors=0, errorDetails=[];
  for (const row of rows) {
    try {
      const district = await District.findOne({ code: row.district_code });
      if (!district) { errors++; errorDetails.push(`District not found: ${row.district_code}`); continue; }
      const existing = await School.findOne({ code: row.code });
      if (existing) { await School.updateOne({ code:row.code },{ name:row.name, town:row.town, enrolled:Number(row.enrolled)||0 }); inserted++; continue; }
      await School.create({
        _id:newId('sch'), code:row.code, name:row.name, town:row.town,
        district_id:district._id, region_id:district.region_id,
        enrolled:Number(row.enrolled)||0, active:true, created_at:nowISO(),
      });
      inserted++;
    } catch(e) { errors++; errorDetails.push(e.message); }
  }
  res.json({ ok:true, processed:rows.length, inserted, errors, error_details:errorDetails.slice(0,10) });
};

// Upload users
exports.uploadUsers = async (req, res) => {
  const rows = parseCSV(req.file.buffer);
  let inserted=0, errors=0, errorDetails=[];
  const defaultPwd = bcrypt.hashSync('gsfp2025', 10);
  for (const row of rows) {
    try {
      const existing = await User.findOne({ username: row.username });
      if (existing) { errors++; errorDetails.push(`User already exists: ${row.username}`); continue; }
      const school   = row.school_code ? await School.findOne({ code:row.school_code }) : null;
      const District = require('../models/District');
      const district = row.district_code ? await District.findOne({ code:row.district_code }) : null;
      await User.create({
        _id:newId('usr'), username:row.username, name:row.name, role:row.role,
        password_hash:defaultPwd, email:row.email||null, phone:row.phone||null,
        school_id:school?._id||null, district_id:district?._id||null,
        region_id:district?.region_id||null, active:true, created_at:nowISO(),
      });
      inserted++;
    } catch(e) { errors++; errorDetails.push(e.message); }
  }
  res.json({ ok:true, processed:rows.length, inserted, errors, error_details:errorDetails.slice(0,10), note:'Default password: gsfp2025' });
};

// Template download
exports.downloadTemplate = (req, res) => {
  const templates = {
    payments: 'school_code,caterer_username,period,days_covered,days_paid,amount_paid,payment_date,reference\nAKT-001,caterer1,2024/2025 - Term 1,60,45,54000,2025-04-15,GCB-TXN-001',
    reports:  'school_code,caterer_username,date,food_type,students_fed,time_ready,time_served,status\nAKT-001,caterer1,2025-01-06,Jollof Rice with Chicken,400,11:00,12:30,approved',
    schools:  'code,name,town,district_code,enrolled,headmaster_name,caterer_name\nAKT-009,New D/A Primary,Akontombra,WNR-AKT,287,Mr. Kwame Asante,Madam Akua Mensah',
    users:    'username,name,role,district_code,school_code,email,phone\nhead9,Mr. Kofi Mensah,headmaster,WNR-AKT,AKT-009,,0244000001',
  };
  const type = req.query.type || 'payments';
  const csv  = templates[type] || templates.payments;
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition',`attachment; filename=gsfp_${type}_template.csv`);
  res.send(csv);
};
