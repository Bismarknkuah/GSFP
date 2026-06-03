const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { audit } = require('../utils/audit');
const { n } = require('../utils/normalize');
const { nowISO } = require('../utils/ids');

exports.login = async (req, res) => {
  const { username, password } = req.body||{};
  if (!username||!password) return res.status(400).json({ error:'Username and password required' });
  const user = await User.findOne({ username:username.trim(), active:true }).lean();
  if (!user||!bcrypt.compareSync(password,user.password_hash)) return res.status(401).json({ error:'Invalid credentials' });
  await User.updateOne({ _id:user._id }, { last_login:nowISO() });
  const { password_hash, ...safe } = user;
  const token = signToken(user);
  await audit({ user, action:'LOGIN', target:user._id, details:`Login from ${req.ip}` });
  res.json({ token, user: n(safe) });
};

exports.me = async (req, res) => {
  const { password_hash, ...safe } = req.user;
  res.json({ user: n(safe) });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body||{};
  if (!currentPassword||!newPassword||newPassword.length<6) return res.status(400).json({ error:'Both passwords required; min 6 chars' });
  const full = await User.findOne({_id:req.user._id}).lean();
  if (!bcrypt.compareSync(currentPassword,full.password_hash)) return res.status(401).json({ error:'Current password incorrect' });
  await User.updateOne({_id:req.user._id},{password_hash:bcrypt.hashSync(newPassword,10)});
  await audit({ user:req.user, action:'PASSWORD_CHANGED', target:req.user._id });
  res.json({ ok:true });
};

exports.updateProfile = async (req, res) => {
  const { name, phone, email, title } = req.body||{};
  const update = {};
  if (name  !== undefined && name.trim())  update.name  = name.trim();
  if (phone !== undefined) update.phone = phone||null;
  if (email !== undefined) update.email = email||null;
  if (title !== undefined) update.title = title||null;
  if (req.file) update.profile_picture = `/uploads/${req.file.filename}`;
  if (!Object.keys(update).length) return res.status(400).json({ error:'Nothing to update' });
  await User.updateOne({ _id:req.user._id }, update);
  await audit({ user:req.user, action:'PROFILE_UPDATED', target:req.user._id, details:`${Object.keys(update).join(', ')} updated` });
  const { password_hash, ...safe } = await User.findOne({_id:req.user._id}).lean();
  const { n } = require('../utils/normalize');
  res.json({ user: n(safe) });
};
