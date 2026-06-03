const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User   = require('../models/User');
const { audit } = require('../utils/audit');
const { n }     = require('../utils/normalize');
const { nowISO } = require('../utils/ids');

// Change own password (authenticated)
exports.change = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Both fields required; new password min 6 chars' });
  const user = await User.findOne({ _id: req.user._id }).lean();
  if (!bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: 'Current password is incorrect' });
  await User.updateOne({ _id: req.user._id }, { password_hash: bcrypt.hashSync(newPassword, 10) });
  await audit({ user: req.user, action: 'PASSWORD_CHANGED', target: req.user._id });
  res.json({ ok: true, message: 'Password changed successfully' });
};

// Admin reset any user's password
exports.adminReset = async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const user = await User.findOne({ _id: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Scope check: regional users can only reset users in their region
  if (req.user.region_id && user.region_id && req.user.region_id !== user.region_id)
    return res.status(403).json({ error: 'Cannot reset users outside your region' });
  if (req.user.district_id && user.district_id && req.user.district_id !== user.district_id)
    return res.status(403).json({ error: 'Cannot reset users outside your district' });
  await User.updateOne({ _id: userId }, { password_hash: bcrypt.hashSync(newPassword, 10) });
  await audit({ user: req.user, action: 'ADMIN_PASSWORD_RESET', target: userId, details: `Reset for ${user.name}` });
  res.json({ ok: true, message: `Password reset for ${user.name}` });
};

// Generate temporary password (admin)
exports.generateTemp = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findOne({ _id: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const temp = 'Gsfp@' + crypto.randomInt(10000, 99999);
  await User.updateOne({ _id: userId }, { password_hash: bcrypt.hashSync(temp, 10) });
  await audit({ user: req.user, action: 'TEMP_PASSWORD_GENERATED', target: userId, details: `For ${user.name}` });
  res.json({ ok: true, temp_password: temp, message: `Temporary password generated for ${user.name}. Please share securely.` });
};

// Self-service: verify username + name (simple forgot password)
exports.forgotCheck = async (req, res) => {
  const { username, name } = req.body || {};
  if (!username || !name) return res.status(400).json({ error: 'Username and full name required' });
  const user = await User.findOne({ username: username.trim(), active: true }).lean();
  if (!user) return res.status(404).json({ error: 'User not found. Contact your administrator.' });
  if (user.name.toLowerCase().trim() !== name.toLowerCase().trim())
    return res.status(400).json({ error: 'Name does not match. Contact your administrator.' });
  // Return masked info for admin contact
  res.json({ ok: true, message: 'Identity verified. Please contact your District or Regional Administrator to reset your password.', admin_note: true, user_id: user._id, role: user.role });
};
