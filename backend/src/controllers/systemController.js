const mongoose = require('mongoose');
const { seed }  = require('../db/seed');
const AuditLog  = require('../models/AuditLog');
const { newId, nowISO } = require('../utils/ids');

exports.reset = async (req, res) => {
  const { scope } = req.body;
  if (!scope) return res.status(400).json({ error: 'scope required: reports | payments | reports_payments | all' });

  const deleted = {};

  if (scope === 'reports' || scope === 'reports_payments' || scope === 'all') {
    const Report = require('../models/Report');
    const r = await Report.deleteMany({});
    deleted.reports = r.deletedCount;
  }
  if (scope === 'payments' || scope === 'reports_payments' || scope === 'all') {
    const Payment = require('../models/Payment');
    const p = await Payment.deleteMany({});
    deleted.payments = p.deletedCount;
  }
  if (scope === 'all') {
    const User        = require('../models/User');
    const School      = require('../models/School');
    const District    = require('../models/District');
    const Region      = require('../models/Region');
    const Budget      = require('../models/Budget');
    const Disbursement= require('../models/Disbursement');
    const Message     = require('../models/Message');
    const [u,s,d,rg,b,db,m] = await Promise.all([
      User.deleteMany({}), School.deleteMany({}), District.deleteMany({}),
      Region.deleteMany({}), Budget.deleteMany({}), Disbursement.deleteMany({}),
      Message.deleteMany({}),
    ]);
    deleted.users = u.deletedCount; deleted.schools = s.deletedCount;
    deleted.districts = d.deletedCount; deleted.regions = rg.deletedCount;
    deleted.budgets = b.deletedCount; deleted.disbursements = db.deletedCount;
    deleted.messages = m.deletedCount;
  }

  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role, action:`SYSTEM_RESET_${scope.toUpperCase()}`,
    target:'system', details:`Data reset by ${req.user.name}: scope=${scope}`, level:'critical' });

  res.json({ ok:true, scope, deleted });
};

exports.reseed = async (req, res) => {
  await seed({ force: true });
  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:req.user._id||req.user.id,
    user_name:req.user.name, user_role:req.user.role, action:'SYSTEM_RESEED',
    target:'system', details:`Database reseeded by ${req.user.name}`, level:'warning' });
  res.json({ ok:true, summary:'16 regions, 5 districts, 8 schools, 34 users, reports, payments, FAQs, disbursements' });
};
