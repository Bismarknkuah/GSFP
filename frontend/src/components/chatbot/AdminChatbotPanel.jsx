import { useEffect, useState } from 'react';
import { Bot, MessageSquare, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Search, Star, Clock, BookOpen, Zap, X } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import EmptyState from '../ui/EmptyState';
import { fmtDateTime, ROLE_LABELS } from '../../utils/format';

const CATEGORIES = ['general','reports','payments','account','messages','workflow','system','finance'];

export function AdminChatbotPanel() {
  const [tab,      setTab]  = useState('pending');
  const [faqs,     setFaqs] = useState([]);
  const [pending,  setPend] = useState([]);
  const [stats,    setStats]= useState(null);
  const [q,        setQ]    = useState('');
  const [catFilter,setCat]  = useState('');
  const [mode,     setMode] = useState(null);
  const [answerMode,setAnsMd]= useState(null);
  const [form,     setForm] = useState({});
  const [err,      setErr]  = useState(null);
  const [ok,       setOk]   = useState(null);
  const [busy,     setBusy] = useState(false);
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => Promise.allSettled([
    api.chatbot.faq.list(), api.chatbot.pending.list(), api.chatbot.stats(),
  ]).then(([faqRes,pendRes,stRes])=>{
    if(faqRes.status==='fulfilled')  setFaqs(faqRes.value?.faqs||[]);
    if(pendRes.status==='fulfilled') setPend(pendRes.value?.questions||[]);
    if(stRes.status==='fulfilled')   setStats(stRes.value);
  }).catch(e=>setErr(e.message));

  useEffect(()=>{ load(); },[]);

  const saveFAQ = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode==='add') await api.chatbot.faq.create(form);
      else await api.chatbot.faq.update(mode._id||mode.id, form);
      setOk(mode==='add'?'FAQ created.':'FAQ updated.'); setMode(null); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const deleteFAQ = async (id) => {
    if (!confirm('Remove this FAQ?')) return;
    await api.chatbot.faq.remove(id).catch(e=>setErr(e.message));
    setOk('FAQ removed.'); load();
  };

  const answerQ = async () => {
    if (!form.answer?.trim()) { setErr('Answer is required'); return; }
    setBusy(true); setErr(null);
    try {
      await api.chatbot.pending.answer(answerMode._id||answerMode.id, { answer:form.answer, addToFAQ:form.addToFAQ!==false, category:form.category||'general', keywords:form.keywords||'' });
      setOk('Question answered' + (form.addToFAQ!==false?' and added to FAQ.':'.')); setAnsMd(null); setForm({}); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const dismiss = async (id) => {
    await api.chatbot.pending.dismiss(id).catch(e=>setErr(e.message));
    setOk('Question dismissed.'); load();
  };

  const visibleFAQs = faqs.filter(f=>{
    if (catFilter && f.category!==catFilter) return false;
    if (q && !f.question.toLowerCase().includes(q.toLowerCase())&&!f.answer.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const visiblePending = pending.filter(p=>tab==='pending'?p.status==='pending':p.status==='answered');

  return (
    <>
      <PageHeader title="Chatbot Management" subtitle="Manage the GSFP Assistant — answer user questions, build the FAQ knowledge base."/>

      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&!mode&&!answerMode&&<div className="mb-4 text-sm text-rust bg-rust/10 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}

      {/* Stats */}
      {stats&&(
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            ['FAQ Entries',       stats.total_faq||0,          'forest',  BookOpen],
            ['Total Sessions',    stats.total_sessions||0,      'navy',    MessageSquare],
            ['Pending Questions', stats.pending_questions||0,   stats.pending_questions>0?'amber':'emerald', Clock],
            ['Questions Answered',stats.answered_questions||0,  'emerald', CheckCircle2],
          ].map(([l,v,t,Icon])=>(
            <Card key={l} className="text-center py-4">
              <Icon className={`w-5 h-5 mx-auto mb-1 text-${t}`}/>
              <div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div>
              <div className="text-xs text-stone-400 mt-0.5">{l}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          ['pending',  `Pending Questions (${pending.filter(p=>p.status==='pending').length})`],
          ['answered', 'Answered Questions'],
          ['faq',      `FAQ Knowledge Base (${faqs.filter(f=>f.active).length})`],
        ].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-forest text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── PENDING QUESTIONS ── */}
      {(tab==='pending'||tab==='answered')&&(
        <div className="space-y-3">
          {visiblePending.length===0 ? (
            <Card><EmptyState icon={MessageSquare} title={tab==='pending'?'No pending questions':'No answered questions yet'} description={tab==='pending'?'All questions from users have been addressed.':'Answer pending questions to build the knowledge base.'}/></Card>
          ) : visiblePending.map(pq=>(
            <Card key={pq._id||pq.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill tone="stone">{ROLE_LABELS[pq.user_role]||pq.user_role}</Pill>
                    <span className="text-xs text-stone-400">{pq.user_name}</span>
                    <span className="text-xs text-stone-300">· {fmtDateTime(pq.created_at)}</span>
                  </div>
                  <p className="font-semibold text-ink">{pq.question}</p>
                  {pq.answer&&(
                    <div className="mt-3 p-3 bg-emerald/5 border border-emerald/20 rounded-xl">
                      <p className="text-xs font-semibold text-emerald mb-1">Answer provided:</p>
                      <p className="text-sm text-stone-600">{pq.answer}</p>
                      {pq.auto_faq&&<p className="text-xs text-emerald mt-1 flex items-center gap-1"><Star className="w-3 h-3"/>Added to FAQ knowledge base</p>}
                    </div>
                  )}
                </div>
                {tab==='pending'&&(
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={()=>{ setAnsMd(pq); setForm({ answer:'', addToFAQ:true, category:'general', keywords:'' }); setErr(null); }}>Answer</Button>
                    <Button size="sm" variant="ghost" onClick={()=>dismiss(pq._id||pq.id)}>Dismiss</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── FAQ KNOWLEDGE BASE ── */}
      {tab==='faq'&&(
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input icon={Search} placeholder="Search FAQs..." value={q} onChange={e=>setQ(e.target.value)} className="flex-1"/>
            <Select value={catFilter} onChange={e=>setCat(e.target.value)} className="sm:w-48"
              options={[{value:'',label:'All categories'},...CATEGORIES.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))]}/>
            <Button icon={Plus} onClick={()=>{ setMode('add'); setForm({question:'',answer:'',category:'general',keywords:''}); setErr(null); }}>Add FAQ</Button>
          </div>

          <div className="space-y-3">
            {visibleFAQs.length===0?<Card><EmptyState icon={BookOpen} title="No FAQs found" description="Add FAQs to build the chatbot knowledge base."/></Card>
            :visibleFAQs.map(faq=>(
              <Card key={faq._id||faq.id} className={!faq.active?'opacity-50':''}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Pill tone="emerald">{faq.category}</Pill>
                      <span className="text-xs text-stone-400 flex items-center gap-1"><Zap className="w-3 h-3"/>{faq.usage_count||0} uses</span>
                      {!faq.active&&<Pill tone="rust">Inactive</Pill>}
                    </div>
                    <p className="font-semibold text-ink text-sm">{faq.question}</p>
                    <p className="text-sm text-stone-500 mt-1 line-clamp-2">{faq.answer}</p>
                    {faq.keywords?.length>0&&(
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {faq.keywords.slice(0,6).map(k=><span key={k} className="text-[10px] bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">{k}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={()=>{ setMode(faq); setForm({ question:faq.question, answer:faq.answer, category:faq.category, keywords:(faq.keywords||[]).join(', '), active:faq.active }); setErr(null); }} className="p-1.5 hover:bg-cream rounded-lg"><Pencil className="w-3.5 h-3.5 text-emerald"/></button>
                    <button onClick={()=>deleteFAQ(faq._id||faq.id)} className="p-1.5 hover:bg-rust/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-rust"/></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* FAQ add/edit modal */}
      <Modal open={!!mode} onClose={()=>setMode(null)} title={mode==='add'?'Add FAQ':'Edit FAQ'} size="lg">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-4">
          <Input label="Question" value={form.question||''} onChange={e=>s('question',e.target.value)} required placeholder="e.g. How do I submit a daily report?"/>
          <Textarea label="Answer" value={form.answer||''} onChange={e=>s('answer',e.target.value)} rows={5} required placeholder="Provide a clear, helpful answer..."/>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Category" value={form.category||'general'} onChange={e=>s('category',e.target.value)}
              options={CATEGORIES.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))}/>
            <Input label="Keywords (comma-separated)" value={form.keywords||''} onChange={e=>s('keywords',e.target.value)} placeholder="submit, report, daily"/>
          </div>
          {mode!=='add'&&<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active!==false} onChange={e=>s('active',e.target.checked)} className="w-4 h-4 accent-emerald"/><span className="text-sm">FAQ is active</span></label>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setMode(null)} disabled={busy}>Cancel</Button>
            <Button onClick={saveFAQ} disabled={busy}>{busy?'Saving...':mode==='add'?'Create FAQ':'Save changes'}</Button>
          </div>
        </div>
      </Modal>

      {/* Answer modal */}
      <Modal open={!!answerMode} onClose={()=>setAnsMd(null)} title="Answer User Question" size="lg">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        {answerMode&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-xs text-stone-400 mb-1">Question from {answerMode.user_name} ({ROLE_LABELS[answerMode.user_role]||answerMode.user_role})</div>
              <p className="font-semibold text-ink">{answerMode.question}</p>
            </div>
            <Textarea label="Your answer" value={form.answer||''} onChange={e=>s('answer',e.target.value)} rows={5} required placeholder="Provide a clear, helpful answer. This will be shown to the user and optionally saved to the FAQ for future users."/>
            <div className="bg-emerald/10 rounded-xl p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.addToFAQ!==false} onChange={e=>s('addToFAQ',e.target.checked)} className="w-4 h-4 accent-emerald mt-0.5"/>
                <div>
                  <div className="text-sm font-semibold text-emerald">Save to FAQ knowledge base</div>
                  <div className="text-xs text-stone-500">Future users asking similar questions will get this answer automatically</div>
                </div>
              </label>
              {form.addToFAQ!==false&&(
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select label="Category" value={form.category||'general'} onChange={e=>s('category',e.target.value)}
                    options={CATEGORIES.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))}/>
                  <Input label="Keywords (auto-detected if blank)" value={form.keywords||''} onChange={e=>s('keywords',e.target.value)} placeholder="payment, rate, daily"/>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>setAnsMd(null)} disabled={busy}>Cancel</Button>
              <Button onClick={answerQ} disabled={busy||!form.answer?.trim()} icon={CheckCircle2}>{busy?'Submitting...':'Submit answer'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
