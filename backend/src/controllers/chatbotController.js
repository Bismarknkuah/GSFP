const FAQ             = require('../models/FAQ');
const ChatSession     = require('../models/ChatSession');
const PendingQuestion = require('../models/PendingQuestion');
const { audit }  = require('../utils/audit');
const { n }      = require('../utils/normalize');
const { newId, nowISO } = require('../utils/ids');

// GSFP context for Claude
const GSFP_CONTEXT = `You are the official AI assistant for the Ghana School Feeding Programme (GSFP) National Management System. 
You help all staff — caterers, headmasters, district coordinators, regional coordinators, finance officers, and national administrators.

Key facts about GSFP:
- Payment rate: GHS 2.00 per pupil per day
- Roles: CEO, National Director, Super Admin, National Admin, National Finance, Regional Minister, Regional Coordinator, District Coordinator (DFC), Finance Officer, Headmaster, Caterer
- Caterers submit daily feeding reports → Headmaster approves → District reviews → Regional oversight → National monitoring
- If headmaster REJECTS a report, the caterer CAN resubmit a corrected report the same day
- Payments are made per academic term (Term 1, 2, 3)
- Arrears = Days Covered minus Days Paid
- Bulk CSV upload is available for bank payment data
- All users can change their password under "Change Password" in the sidebar
- All users can update their profile and upload a profile picture under "My Profile"
- Reports can be exported as PDF or Excel from any reports screen
- The system has 16 Ghana regions with multiple districts each

Be helpful, concise, and professional. If you don't know the specific answer, say so and offer to escalate to an administrator.`;

// Search FAQ for matching question
async function searchFAQ(question) {
  const words = question.toLowerCase().split(/\s+/).filter(w=>w.length>3);
  const allFAQs = await FAQ.find({ active:true }).lean();
  let best = null, bestScore = 0;
  for (const faq of allFAQs) {
    const qLower = faq.question.toLowerCase();
    const aLower = faq.answer.toLowerCase();
    const kwLower= (faq.keywords||[]).map(k=>k.toLowerCase());
    let score = 0;
    words.forEach(w => {
      if (qLower.includes(w)) score += 3;
      if (aLower.includes(w)) score += 1;
      if (kwLower.some(k=>k.includes(w))) score += 2;
    });
    if (score > bestScore) { bestScore = score; best = faq; }
  }
  return bestScore >= 3 ? best : null;
}

// Ask Claude API
async function askClaude(question, faqs, userRole) {
  try {
    const faqContext = faqs.length > 0
      ? '\n\nKnown Q&A from the GSFP knowledge base:\n' + faqs.slice(0,5).map(f=>`Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
      : '';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:600,
        system: GSFP_CONTEXT + faqContext,
        messages:[{ role:'user', content:`User role: ${userRole}\nQuestion: ${question}` }],
      }),
    });
    const data = await response.json();
    if (data.content && data.content[0]) return { answer: data.content[0].text, from_ai: true };
    return null;
  } catch(e) { console.error('[chatbot/claude]', e.message); return null; }
}

// ── User sends a message ──────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  const { message, sessionId } = req.body||{};
  if (!message?.trim()) return res.status(400).json({ error:'Message required' });

  // Get or create session
  let session = sessionId ? await ChatSession.findOne({_id:sessionId}).lean() : null;
  if (!session) {
    const sid = newId('ses');
    session = { _id:sid, user_id:req.user._id, user_name:req.user.name, user_role:req.user.role, messages:[], status:'active', created_at:nowISO(), updated_at:nowISO() };
    await ChatSession.create(session);
  }

  // Add user message
  const userMsg = { role:'user', content:message.trim(), timestamp:nowISO() };
  await ChatSession.updateOne({ _id:session._id }, { $push:{ messages:userMsg }, updatedAt:nowISO() });

  // 1. Search FAQ first
  const faqMatch = await searchFAQ(message);
  if (faqMatch) {
    await FAQ.updateOne({ _id:faqMatch._id }, { $inc:{ usage_count:1 } });
    const reply = { role:'assistant', content:faqMatch.answer, timestamp:nowISO(), faq_id:faqMatch._id };
    await ChatSession.updateOne({ _id:session._id }, { $push:{ messages:reply } });
    return res.json({ reply:faqMatch.answer, session_id:session._id, source:'faq', faq_id:faqMatch._id });
  }

  // 2. Try Claude AI
  const allFAQs = await FAQ.find({ active:true }).lean();
  const aiResult = await askClaude(message, allFAQs, req.user.role);
  if (aiResult) {
    const reply = { role:'assistant', content:aiResult.answer, timestamp:nowISO() };
    await ChatSession.updateOne({ _id:session._id }, { $push:{ messages:reply } });
    return res.json({ reply:aiResult.answer, session_id:session._id, source:'ai' });
  }

  // 3. Escalate to admin
  const pqId = newId('pq');
  await PendingQuestion.create({ _id:pqId, user_id:req.user._id, user_name:req.user.name, user_role:req.user.role, question:message.trim(), status:'pending', created_at:nowISO() });
  const escalateMsg = `I don't have a specific answer to that question right now. I've flagged it for one of our administrators to respond. You'll be notified once an answer is available.\n\nIn the meantime, you can:\n• Check the sidebar navigation for the relevant module\n• Contact your District or Regional Coordinator\n• Use the Messages feature to send a direct message`;
  const reply = { role:'assistant', content:escalateMsg, timestamp:nowISO(), is_pending:true };
  await ChatSession.updateOne({ _id:session._id }, { $push:{ messages:reply }, status:'pending_admin', pending_question:message.trim() });
  return res.json({ reply:escalateMsg, session_id:session._id, source:'escalated', pending_id:pqId });
};

// ── Get session history ───────────────────────────────────────────────────────
exports.getSession = async (req, res) => {
  const session = await ChatSession.findOne({ _id:req.params.id, user_id:req.user._id }).lean();
  if (!session) return res.status(404).json({ error:'Session not found' });
  res.json({ session: n(session) });
};

// ── FAQ management (admin) ────────────────────────────────────────────────────
exports.listFAQ = async (_req, res) => {
  const faqs = await FAQ.find({}).sort({ usage_count:-1 }).lean();
  res.json({ faqs: faqs.map(n) });
};

exports.createFAQ = async (req, res) => {
  const { question, answer, category, keywords } = req.body||{};
  if (!question||!answer) return res.status(400).json({ error:'question and answer required' });
  const id = newId('faq');
  const kws = keywords ? (Array.isArray(keywords)?keywords:keywords.split(',').map(k=>k.trim())) : question.toLowerCase().split(/\s+/).filter(w=>w.length>3);
  await FAQ.create({ _id:id, question:question.trim(), answer:answer.trim(), category:category||'general', keywords:kws, usage_count:0, created_by:req.user._id, active:true, created_at:nowISO(), updated_at:nowISO() });
  await audit({ user:req.user, action:'FAQ_CREATED', target:id, details:question });
  res.status(201).json({ faq: n(await FAQ.findOne({_id:id}).lean()) });
};

exports.updateFAQ = async (req, res) => {
  const { question, answer, category, keywords, active } = req.body||{};
  const faq = await FAQ.findOne({ _id:req.params.id });
  if (!faq) return res.status(404).json({ error:'FAQ not found' });
  if (question) faq.question = question.trim();
  if (answer)   faq.answer   = answer.trim();
  if (category) faq.category = category;
  if (keywords) faq.keywords = Array.isArray(keywords)?keywords:keywords.split(',').map(k=>k.trim());
  if (active !== undefined) faq.active = active;
  faq.updated_at = nowISO();
  await faq.save();
  res.json({ faq: n(faq.toObject()) });
};

exports.deleteFAQ = async (req, res) => {
  await FAQ.updateOne({ _id:req.params.id }, { active:false });
  await audit({ user:req.user, action:'FAQ_DELETED', target:req.params.id });
  res.json({ ok:true });
};

// ── Pending questions (admin) ─────────────────────────────────────────────────
exports.listPending = async (req, res) => {
  const q = req.query.status ? { status:req.query.status } : {};
  const pqs = await PendingQuestion.find(q).sort({ created_at:-1 }).lean();
  res.json({ questions: pqs.map(n) });
};

exports.answerQuestion = async (req, res) => {
  const { answer, addToFAQ, category, keywords } = req.body||{};
  if (!answer) return res.status(400).json({ error:'Answer required' });
  const pq = await PendingQuestion.findOne({ _id:req.params.id });
  if (!pq) return res.status(404).json({ error:'Question not found' });
  pq.answer = answer.trim(); pq.answered_by = req.user._id;
  pq.answered_at = nowISO(); pq.status = 'answered';
  let faqId = null;
  if (addToFAQ) {
    faqId = newId('faq');
    const kws = keywords ? keywords.split(',').map(k=>k.trim()) : pq.question.toLowerCase().split(/\s+/).filter(w=>w.length>3);
    await FAQ.create({ _id:faqId, question:pq.question, answer:answer.trim(), category:category||'general', keywords:kws, usage_count:0, created_by:req.user._id, active:true, created_at:nowISO(), updated_at:nowISO() });
    pq.auto_faq = true; pq.faq_id = faqId;
  }
  await pq.save();
  await audit({ user:req.user, action:'QUESTION_ANSWERED', target:req.params.id, details:`FAQ:${addToFAQ?'yes':'no'}` });
  res.json({ question: n(pq.toObject()), faq_id:faqId });
};

exports.dismissQuestion = async (req, res) => {
  await PendingQuestion.updateOne({ _id:req.params.id }, { status:'dismissed' });
  res.json({ ok:true });
};

exports.stats = async (_req, res) => {
  const [totalFAQ, totalSessions, pending, answered] = await Promise.all([
    FAQ.countDocuments({ active:true }),
    ChatSession.countDocuments(),
    PendingQuestion.countDocuments({ status:'pending' }),
    PendingQuestion.countDocuments({ status:'answered' }),
  ]);
  res.json({ total_faq:totalFAQ, total_sessions:totalSessions, pending_questions:pending, answered_questions:answered });
};
