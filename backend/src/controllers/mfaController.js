const MFA  = require('../models/MFA');
const User = require('../models/User');
const { notifyUser } = require('./notificationController');
const { audit }  = require('../utils/audit');
const { n }      = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');
const crypto = require('crypto');

// Generate 6-digit OTP
function generateOTP() { return String(Math.floor(100000+Math.random()*900000)); }

// Simple TOTP-compatible base32 secret
function generateSecret() { return crypto.randomBytes(20).toString('hex').toUpperCase(); }

// In-memory OTP store (in production: use Redis)
const otpStore = new Map();

exports.setup = async (req, res) => {
  const { method } = req.body||{};
  const allowed = ['email','sms','totp'];
  if (!allowed.includes(method)) return res.status(400).json({ error:'method must be email, sms, or totp' });
  const user = await User.findOne({_id:req.user._id}).lean();
  if (method!=='totp'&&!user.email&&!user.phone) return res.status(400).json({ error:'Add email or phone to your profile first' });
  const secret = generateSecret();
  const existing = await MFA.findOne({ user_id:req.user._id });
  if (existing) { existing.secret=secret; existing.method=method; existing.enabled=false; await existing.save(); }
  else { await MFA.create({ _id:newId('mfa'), user_id:req.user._id, secret, method, enabled:false, created_at:nowISO() }); }
  await audit({ user:req.user, action:'MFA_SETUP_INITIATED', target:req.user._id, details:`Method: ${method}` });
  res.json({ setup_initiated:true, method, message:`MFA ${method} setup initiated. Verify with OTP to enable.` });
};

exports.sendOTP = async (req, res) => {
  const user = await User.findOne({_id:req.user._id}).lean();
  const mfa  = await MFA.findOne({ user_id:req.user._id }).lean();
  if (!mfa) return res.status(400).json({ error:'MFA not configured. Call /setup first.' });
  const otp = generateOTP();
  otpStore.set(req.user._id, { otp, expires:Date.now()+600000 }); // 10 min
  const method = mfa.method;
  if (method==='email'&&user.email) {
    await notifyUser(req.user._id, { subject:'Your GSFP Verification Code', html:`<h2>GSFP MFA Code</h2><p>Your verification code is: <strong style="font-size:2em;letter-spacing:4px">${otp}</strong></p><p>This code expires in 10 minutes.</p>`, smsBody:null });
  } else if (method==='sms'&&user.phone) {
    await notifyUser(req.user._id, { subject:null, html:null, smsBody:`Your GSFP verification code is ${otp}. Expires in 10 minutes.` });
  }
  res.json({ sent:true, method, destination:method==='email'?user.email?.replace(/(.{2}).+(@.+)/,'$1***$2'):user.phone?.slice(0,-4)+'****' });
};

exports.verify = async (req, res) => {
  const { otp } = req.body||{};
  if (!otp) return res.status(400).json({ error:'OTP required' });
  const stored = otpStore.get(req.user._id);
  if (!stored||Date.now()>stored.expires) return res.status(401).json({ error:'OTP expired. Request a new code.' });
  if (stored.otp!==String(otp)) return res.status(401).json({ error:'Invalid OTP' });
  otpStore.delete(req.user._id);
  await MFA.updateOne({ user_id:req.user._id },{ enabled:true, verified_at:nowISO() });
  await User.updateOne({ _id:req.user._id },{ mfa_enabled:true });
  await audit({ user:req.user, action:'MFA_ENABLED', target:req.user._id });
  res.json({ verified:true, mfa_enabled:true, message:'MFA successfully enabled on your account.' });
};

exports.disable = async (req, res) => {
  await MFA.updateOne({ user_id:req.user._id },{ enabled:false });
  await User.updateOne({ _id:req.user._id },{ mfa_enabled:false });
  await audit({ user:req.user, action:'MFA_DISABLED', target:req.user._id });
  res.json({ disabled:true });
};

exports.getStatus = async (req, res) => {
  const mfa  = await MFA.findOne({ user_id:req.user._id }).lean();
  const user = await User.findOne({ _id:req.user._id }).lean();
  res.json({ enabled:!!user.mfa_enabled, method:mfa?.method||null, configured:!!mfa });
};
