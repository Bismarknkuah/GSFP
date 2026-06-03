const GhanaCard = require('../models/GhanaCard');
const User      = require('../models/User');
const { audit } = require('../utils/audit');
const { n }     = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');

// Simulated NIA verification (in production, call the real NIA API)
async function verifyWithNIA(cardNumber, fullName, dob) {
  // NIA API endpoint (stub - replace with real integration)
  // Real: POST https://api.nia.gov.gh/v1/verify  
  // For now: format validation + return simulated response
  const GHA_PATTERN = /^GHA-\d{9}-\d$/;
  if (!GHA_PATTERN.test(cardNumber)) {
    return { success:false, message:'Invalid Ghana Card format. Expected: GHA-XXXXXXXXX-X' };
  }
  // In production, call real NIA API here
  // const response = await fetch('https://api.nia.gov.gh/v1/verify', { method:'POST', body:JSON.stringify({card_number:cardNumber,full_name:fullName}), headers:{'Authorization':`Bearer ${process.env.NIA_API_KEY}`,'Content-Type':'application/json'} });
  // Simulate success for valid format
  const isValid = cardNumber.length === 15;
  return {
    success: isValid,
    nia_reference: isValid ? `NIA-REF-${Date.now()}` : null,
    message: isValid ? 'Identity verified successfully by NIA' : 'Verification failed',
    // In real: return card holder name, DOB, photo from NIA
  };
}

exports.getStatus = async (req, res) => {
  const userId = req.params.userId || req.user._id;
  const gc = await GhanaCard.findOne({ user_id:userId }).lean();
  const user = await User.findOne({ _id:userId }).select('-password_hash').lean();
  res.json({ verification: gc ? n(gc) : null, user: n(user) });
};

exports.submit = async (req, res) => {
  const { ghana_card_number, full_name_on_card, date_of_birth, gender } = req.body||{};
  if (!ghana_card_number||!full_name_on_card) return res.status(400).json({ error:'Ghana Card number and full name required' });
  const userId = req.user._id;
  const now = nowISO();
  const existing = await GhanaCard.findOne({ user_id:userId }).lean();
  if (existing?.verification_status==='verified') return res.status(409).json({ error:'Already verified' });

  // Try NIA verification
  const niaResult = await verifyWithNIA(ghana_card_number, full_name_on_card, date_of_birth);
  const status = niaResult.success ? 'verified' : 'pending'; // if NIA fails, queue for manual review

  const data = {
    ghana_card_number: ghana_card_number.toUpperCase().trim(),
    full_name_on_card: full_name_on_card.trim(),
    date_of_birth: date_of_birth||null,
    gender: gender||null,
    verification_status: status,
    verification_method: niaResult.success ? 'api' : 'manual',
    nia_reference: niaResult.nia_reference||null,
    verified_at: niaResult.success ? now : null,
    submitted_at: now, updated_at: now,
  };

  if (existing) {
    await GhanaCard.updateOne({ user_id:userId }, data);
  } else {
    await GhanaCard.create({ _id:newId('ghc'), user_id:userId, created_at:now, ...data });
  }

  await audit({ user:req.user, action:niaResult.success?'GHANA_CARD_VERIFIED':'GHANA_CARD_SUBMITTED', target:userId, details:`Card: ${ghana_card_number}` });
  res.json({ verification:n(await GhanaCard.findOne({user_id:userId}).lean()), nia_result:niaResult });
};

// Admin manually verifies a user
exports.adminVerify = async (req, res) => {
  const { userId } = req.params;
  const { note } = req.body||{};
  const gc = await GhanaCard.findOne({ user_id:userId });
  if (!gc) return res.status(404).json({ error:'No Ghana Card submission found for this user' });
  gc.verification_status='verified'; gc.verification_method='manual';
  gc.verified_by=req.user._id; gc.verified_at=nowISO(); gc.updated_at=nowISO();
  if (note) gc.resolution_note = note;
  await gc.save();
  await audit({ user:req.user, action:'GHANA_CARD_ADMIN_VERIFIED', target:userId, details:`Manually verified by ${req.user.name}` });
  res.json({ verification:n(gc.toObject()) });
};

exports.adminReject = async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body||{};
  if (!reason) return res.status(400).json({ error:'Rejection reason required' });
  await GhanaCard.updateOne({ user_id:userId }, { verification_status:'failed', rejection_reason:reason, updated_at:nowISO() });
  await audit({ user:req.user, action:'GHANA_CARD_REJECTED', target:userId, details:`Reason: ${reason}` });
  res.json({ ok:true });
};

exports.listAll = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { verification_status:status } : {};
    const cards = await GhanaCard.find(filter).sort({ submitted_at:-1 }).lean();
    const enriched = await Promise.all(cards.map(async gc=>{
      const user = await User.findOne({_id:gc.user_id}).select('-password_hash').lean();
      return n({ ...gc, user });
    }));
    res.json({ verifications:enriched, stats:{
      total:cards.length,
      verified:cards.filter(c=>c.verification_status==='verified').length,
      pending:cards.filter(c=>c.verification_status==='pending').length,
      failed:cards.filter(c=>c.verification_status==='failed').length,
      not_submitted:cards.filter(c=>c.verification_status==='not_submitted').length,
    }});
  } catch(e) { res.json({ verifications:[], stats:{} }); }
};

exports.stats = async (_req, res) => {
  try {
    const [caterers, verified] = await Promise.all([
      User.countDocuments({ role:'caterer', active:true }),
      GhanaCard.countDocuments({ verification_status:'verified' }),
    ]);
    const all = await GhanaCard.find({}).lean();
    res.json({
      total_caterers:caterers, verified:verified,
      pending:all.filter(c=>c.verification_status==='pending').length,
      failed:all.filter(c=>c.verification_status==='failed').length,
      unsubmitted:Math.max(0,caterers-all.length),
      verification_rate:caterers>0?Math.round(verified/caterers*100):0,
    });
  } catch(e) { res.json({ total_caterers:0,verified:0,pending:0,failed:0,unsubmitted:0,verification_rate:0 }); }
};
