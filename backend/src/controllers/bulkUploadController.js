const { parse } = require('csv-parse/sync');
const School    = require('../models/School');
const User      = require('../models/User');
const Payment   = require('../models/Payment');
const AuditLog  = require('../models/AuditLog');
const { audit } = require('../utils/audit');
const { n }     = require('../utils/normalize');
const { newId, nowISO, todayISO } = require('../utils/ids');

const RATE = 2.00;

// Parse uploaded CSV/bank data
exports.uploadPayments = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const raw = req.file.buffer.toString('utf8');
  let rows;
  try {
    rows = parse(raw, {
      columns: true, skip_empty_lines: true, trim: true,
      cast: true, relax_quotes: true,
    });
  } catch (e) {
    return res.status(400).json({ error: `Could not parse CSV: ${e.message}` });
  }

  const results = { created: [], updated: [], skipped: [], errors: [] };

  for (const row of rows) {
    try {
      // Flexible column mapping
      const schoolCode     = (row['school_code'] || row['School Code'] || row['school_code'] || '').toString().trim().toUpperCase();
      const period         = (row['period'] || row['Period'] || row['term'] || '2025/2026 - Term 1').toString().trim();
      const daysCovered    = Number(row['days_covered'] || row['Days Covered'] || row['days_served'] || 0);
      const daysPaid       = Number(row['days_paid'] || row['Days Paid'] || row['days_paid'] || 0);
      const amountPaid     = Number(row['amount_paid'] || row['Amount Paid'] || row['amount'] || 0);
      const paymentDate    = (row['payment_date'] || row['Payment Date'] || row['date'] || todayISO()).toString().trim();
      const reference      = (row['reference'] || row['Reference'] || row['transaction_id'] || row['bank_ref'] || '').toString().trim();
      const bankName       = (row['bank_name'] || row['Bank'] || 'Bank Upload').toString().trim();

      if (!schoolCode) { results.skipped.push({ row, reason: 'Missing school_code' }); continue; }

      const school = await School.findOne({ code: schoolCode, active: true }).lean();
      if (!school) { results.errors.push({ schoolCode, reason: `School ${schoolCode} not found` }); continue; }

      const caterer = school.caterer_id ? await User.findOne({ _id: school.caterer_id, role: 'caterer' }).lean() : null;
      if (!caterer) { results.errors.push({ schoolCode, reason: 'No caterer linked to school' }); continue; }

      const daysArr   = Math.max(0, daysCovered - daysPaid);
      const enrolled  = school.enrolled;
      const rate      = caterer.rate_per_student || RATE;
      const expected  = daysPaid * enrolled * rate;
      const arrAmt    = daysArr * enrolled * rate;
      const auto      = amountPaid > 0 ? amountPaid : expected;

      // Check if payment record already exists for this caterer+period
      const existing = await Payment.findOne({ caterer_id: caterer._id, period }).lean();
      if (existing) {
        await Payment.updateOne({ _id: existing._id }, {
          days_covered: Math.max(existing.days_covered, daysCovered),
          days_paid: Math.max(existing.days_paid, daysPaid),
          days_arrears: Math.max(0, Math.max(existing.days_covered, daysCovered) - Math.max(existing.days_paid, daysPaid)),
          amount_paid: auto,
          arrears_amount: arrAmt,
          status: daysArr === 0 ? 'fully-paid' : 'partial',
          last_payment_date: paymentDate,
          reference: reference || existing.reference,
          source: bankName,
        });
        results.updated.push({ schoolCode, caterer: caterer.name, daysPaid, amount: auto });
      } else {
        const id = newId('pay');
        await Payment.create({
          _id: id, caterer_id: caterer._id,
          district_id: school.district_id, region_id: school.region_id,
          period, meals_served: daysPaid * enrolled,
          days_covered: daysCovered, days_paid: daysPaid, days_arrears: daysArr,
          rate_per_student: rate, amount_paid: auto, arrears_amount: arrAmt,
          status: daysArr === 0 ? 'fully-paid' : 'partial',
          last_payment_date: paymentDate,
          source: bankName, reference: reference || null,
          caterer_reported: false, received_amount: auto,
          co_approval_required: !!school.caterer2_id, co_approved: !school.caterer2_id,
          visible_to_oversight: true, created_at: nowISO(),
        });
        results.created.push({ schoolCode, caterer: caterer.name, daysPaid, amount: auto });
      }
    } catch (e) {
      results.errors.push({ row, reason: e.message });
    }
  }

  await audit({ user: req.user, action: 'BULK_PAYMENT_UPLOAD', target: 'payments',
    details: `Created:${results.created.length} Updated:${results.updated.length} Errors:${results.errors.length}` });

  res.json({
    summary: { total: rows.length, created: results.created.length, updated: results.updated.length, skipped: results.skipped.length, errors: results.errors.length },
    results,
  });
};

exports.downloadTemplate = (_req, res) => {
  const header = 'school_code,period,days_covered,days_paid,amount_paid,payment_date,reference,bank_name';
  const example = [
    'AKT-001,2025/2026 - Term 1,60,50,53000,2025-10-15,GCB-TXN-001,Ghana Commercial Bank',
    'AKT-002,2025/2026 - Term 1,60,45,38745,2025-10-15,GCB-TXN-002,Ghana Commercial Bank',
    'AKT-003,2025/2026 - Term 1,60,55,47300,2025-10-15,GCB-TXN-003,Ghana Commercial Bank',
  ];
  const csv = [header, ...example].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=GSFP_payment_upload_template.csv');
  res.send(csv);
};

exports.paymentSummaryByLevel = async (req, res) => {
  const { level, regionId, districtId } = req.query;
  const u = req.user;
  const filter = {};
  if (regionId)   filter.region_id   = regionId;
  if (districtId) filter.district_id = districtId;
  if (u.region_id && !regionId)     filter.region_id   = u.region_id;
  if (u.district_id && !districtId) filter.district_id = u.district_id;

  const payments = await Payment.find(filter).lean();
  const schools  = await School.find(filter.district_id ? { district_id:filter.district_id } : filter.region_id ? { region_id:filter.region_id } : {}).lean();
  const caterers = await User.find({ role:'caterer', ...(filter.district_id?{district_id:filter.district_id}:filter.region_id?{region_id:filter.region_id}:{}) }).lean();

  const received  = payments.filter(p=>p.days_paid>0).length;
  const totalDaysPaid    = payments.reduce((s,p)=>s+p.days_paid,0);
  const totalDaysCovered = payments.reduce((s,p)=>s+p.days_covered,0);
  const totalArrears     = payments.reduce((s,p)=>s+p.days_arrears,0);
  const totalAmountPaid  = payments.reduce((s,p)=>s+p.amount_paid,0);
  const totalArrearAmt   = payments.reduce((s,p)=>s+p.arrears_amount,0);
  const fullyPaid        = payments.filter(p=>p.status==='fully-paid').length;

  res.json({
    summary: {
      total_caterers: caterers.length,
      caterers_received_pay: received,
      caterers_with_arrears: payments.filter(p=>p.days_arrears>0).length,
      caterers_fully_paid: fullyPaid,
      total_days_covered: totalDaysCovered,
      total_days_paid: totalDaysPaid,
      total_days_arrears: totalArrears,
      total_amount_paid: totalAmountPaid,
      total_arrears_amount: totalArrearAmt,
      total_schools: schools.length,
      rate_per_day_per_pupil: RATE,
    },
    payments: payments.map(n),
  });
};
