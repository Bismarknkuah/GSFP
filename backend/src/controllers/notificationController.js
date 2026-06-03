const NotificationLog = require('../models/NotificationLog');
const User            = require('../models/User');
const { newId, nowISO } = require('../utils/ids');

// ── Nodemailer email ──────────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  try {
    const nodemailer = require('nodemailer');
    if (!process.env.SMTP_HOST) {
      console.log(`[email] SMTP not configured. Would send to ${to}: ${subject}`);
      return { success:true, simulated:true };
    }
    const transporter = nodemailer.createTransport({
      host:    process.env.SMTP_HOST,
      port:    Number(process.env.SMTP_PORT)||587,
      secure:  process.env.SMTP_SECURE==='true',
      auth: { user:process.env.SMTP_USER, pass:process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from:`"GSFP System" <${process.env.SMTP_FROM||'noreply@gsfp.gov.gh'}>`, to, subject, html });
    return { success:true };
  } catch(e) { console.error('[email]', e.message); return { success:false, error:e.message }; }
}

// ── Twilio SMS ────────────────────────────────────────────────────────────────
async function sendSMS(to, body) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log(`[sms] Twilio not configured. Would send to ${to}: ${body}`);
      return { success:true, simulated:true };
    }
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ body, from:process.env.TWILIO_FROM, to });
    return { success:true };
  } catch(e) { console.error('[sms]', e.message); return { success:false, error:e.message }; }
}

// ── Push notification ─────────────────────────────────────────────────────────
async function sendPush(subscription, title, body, url='/') {
  try {
    if (!process.env.VAPID_PRIVATE_KEY) {
      console.log(`[push] VAPID not configured. Would push: ${title}`);
      return { success:true, simulated:true };
    }
    const webpush = require('web-push');
    webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL||'admin@gsfp.gov.gh'}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url, icon:'/favicon.svg' }));
    return { success:true };
  } catch(e) { console.error('[push]', e.message); return { success:false, error:e.message }; }
}

// ── Log notification ──────────────────────────────────────────────────────────
async function logNotification(userId, channel, subject, body, recipient, status, error=null) {
  const id = newId('nlog');
  await NotificationLog.create({ _id:id, user_id:userId, channel, subject, body, recipient, status, error, sent_at:status==='sent'?nowISO():null, created_at:nowISO() }).catch(()=>{});
}

// ── Send to user (all configured channels) ────────────────────────────────────
exports.notifyUser = async (userId, { subject, html, smsBody, pushTitle, pushBody, url='/' }) => {
  const user = await User.findOne({ _id:userId }).lean();
  if (!user) return;
  const results = {};

  if (user.email && subject && html) {
    const r = await sendEmail(user.email, subject, html);
    await logNotification(userId,'email',subject,html,user.email,r.success?'sent':'failed',r.error);
    results.email = r;
  }

  if (user.phone && smsBody) {
    const phone = user.phone.replace(/\s/g,'').replace(/^0/,'+233');
    const r = await sendSMS(phone, smsBody);
    await logNotification(userId,'sms',null,smsBody,phone,r.success?'sent':'failed',r.error);
    results.sms = r;
  }

  if (pushTitle) {
    await logNotification(userId,'push',pushTitle,pushBody||'',userId,'sent');
    results.push = { success:true };
  }

  return results;
};

// ── Broadcast to role ─────────────────────────────────────────────────────────
exports.broadcastToRole = async (roles, payload) => {
  const users = await User.find({ role:{ $in:Array.isArray(roles)?roles:[roles] }, active:true }).lean();
  for (const u of users) {
    await exports.notifyUser(u._id, payload).catch(()=>{});
  }
  return { sent: users.length };
};

// ── API: test notification ─────────────────────────────────────────────────────
exports.test = async (req, res) => {
  const { channel, recipient, message } = req.body||{};
  if (!channel||!recipient||!message) return res.status(400).json({ error:'channel, recipient and message required' });
  let result;
  if (channel==='email') result = await sendEmail(recipient, 'GSFP Test Notification', `<p>${message}</p>`);
  else if (channel==='sms') result = await sendSMS(recipient, message);
  else result = { success:true, simulated:true, note:'Push requires client subscription' };
  res.json({ result, channel, recipient });
};

exports.getLogs = async (req, res) => {
  const logs = await NotificationLog.find({}).sort({ created_at:-1 }).limit(100).lean();
  res.json({ logs });
};

exports.getVapidPublicKey = (_req, res) => {
  res.json({ public_key: process.env.VAPID_PUBLIC_KEY||'NOT_CONFIGURED', configured: !!process.env.VAPID_PUBLIC_KEY });
};
