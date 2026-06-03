import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, Mail, Globe, Users, Search, CheckCircle2, AlertCircle, Bell, X, User } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
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

const PRIORITY_TONE = { low:'stone', normal:'forest', high:'amber', urgent:'rust' };

const BROADCAST_OPTIONS = [
  { value:'BROADCAST_ALL',           label:'Everyone (All Users)',          icon:'🌐' },
  { value:'BROADCAST_CATERERS',      label:'All Caterers',                  icon:'👨‍🍳' },
  { value:'BROADCAST_HEADMASTERS',   label:'All Headmasters',               icon:'🏫' },
  { value:'BROADCAST_DFC',           label:'All District Coordinators',     icon:'📋' },
  { value:'BROADCAST_RFC',           label:'All Regional Coordinators',     icon:'🗺️' },
  { value:'BROADCAST_REGIONAL',      label:'All Regional Staff',            icon:'🏛️' },
  { value:'BROADCAST_NATIONAL',      label:'National Staff Only',           icon:'🇬🇭' },
];

const ROLE_VISIBLE = {
  super_admin: BROADCAST_OPTIONS,
  national_admin: BROADCAST_OPTIONS,
  national_finance: BROADCAST_OPTIONS.filter(o=>['BROADCAST_ALL','BROADCAST_NATIONAL'].includes(o.value)),
  regional_minister: BROADCAST_OPTIONS.filter(o=>['BROADCAST_ALL','BROADCAST_REGIONAL','BROADCAST_RFC','BROADCAST_DFC'].includes(o.value)),
  regional_coordinator: BROADCAST_OPTIONS.filter(o=>['BROADCAST_ALL','BROADCAST_REGIONAL','BROADCAST_RFC','BROADCAST_DFC','BROADCAST_CATERERS','BROADCAST_HEADMASTERS'].includes(o.value)),
  regional_admin: BROADCAST_OPTIONS.filter(o=>['BROADCAST_ALL','BROADCAST_REGIONAL'].includes(o.value)),
  district_director: BROADCAST_OPTIONS.filter(o=>['BROADCAST_ALL','BROADCAST_DFC','BROADCAST_CATERERS','BROADCAST_HEADMASTERS'].includes(o.value)),
  district_coordinator: BROADCAST_OPTIONS.filter(o=>['BROADCAST_ALL','BROADCAST_DFC','BROADCAST_CATERERS','BROADCAST_HEADMASTERS'].includes(o.value)),
};

export default function MessagingCenter() {
  const { user } = useAuth();
  const [inbox, setMail]       = useState([]);
  const [sent, setSent]         = useState([]);
  const [tab, setTab]           = useState('inbox');
  const [compose, setCompose]   = useState(false);
  const [detail, setDetail]     = useState(null);
  const [users, setUsers]       = useState([]);
  const [userQ, setUserQ]       = useState('');
  const [form, setForm]         = useState({ recipientType:'broadcast', recipient:'', subject:'', body:'', priority:'normal' });
  const [err, setErr]           = useState(null);
  const [ok, setOk]             = useState(null);
  const [busy, setBusy]         = useState(false);
  const uid = user._id || user.id;
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => api.messages.list().then(({inbox,sent})=>{setMail(inbox||[]);setSent(sent||[]);}).catch(console.error);
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    if (form.recipientType==='individual') {
      api.messages.users({ q:userQ||undefined }).then(({users})=>setUsers(users||[])).catch(()=>{});
    }
  },[form.recipientType, userQ]);

  const openMsg = (msg) => {
    setDetail(msg);
    if (!((msg.read_by||[]).includes(uid))) api.messages.markRead(msg._id||msg.id).then(load).catch(()=>{});
  };

  const markAllRead = () => api.messages.markAllRead().then(load).catch(()=>{});

  const send = async () => {
    if (!form.body) { setErr('Message body required'); return; }
    const recipient = form.recipientType==='broadcast' ? form.recipient : form.individualId;
    if (!recipient) { setErr('Please select a recipient'); return; }
    setBusy(true); setErr(null);
    try {
      await api.messages.send({ recipient, subject:form.subject, body:form.body, priority:form.priority });
      setOk('Message sent successfully.'); setCompose(false);
      setForm({ recipientType:'broadcast', recipient:'', subject:'', body:'', priority:'normal' });
      load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const broadcasts = ROLE_VISIBLE[user.role] || BROADCAST_OPTIONS.filter(o=>o.value==='BROADCAST_ALL');
  const unread = inbox.filter(m=>!(m.read_by||[]).includes(uid)).length;

  return (
    <>
      <PageHeader title="Messages" subtitle="Internal communications — direct messages and broadcasts.">
        <div className="flex gap-2">
          {unread>0&&<Button variant="secondary" size="sm" onClick={markAllRead}>Mark all read</Button>}
          <Button icon={Send} onClick={()=>{setCompose(true);setErr(null);}}>Compose</Button>
        </div>
      </PageHeader>

      {ok&&<div className="mb-4 text-sm text-emerald bg-emerald/10 rounded-lg p-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

      <div className="flex gap-2 mb-4 flex-wrap">
        {[['inbox','Mail',unread],['sent','Sent',0]].map(([t,l,badge])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${tab===t?'bg-forest text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {l}{badge>0&&<span className="bg-rust text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
          </button>
        ))}
      </div>

      <Card noPadding>
        {(tab==='inbox'?inbox:sent).length===0 ? (
          <EmptyState icon={MessageSquare} title={tab==='inbox'?'No messages':'No sent messages'} description="Compose a message to get started."/>
        ) : (
          <div className="divide-y divide-stone-50">
            {(tab==='inbox'?inbox:sent).map(msg => {
              const isRead = (msg.read_by||[]).includes(uid);
              const isBroad = msg.recipient?.startsWith('BROADCAST_');
              return (
                <div key={msg._id||msg.id} onClick={()=>openMsg(msg)}
                  className={`px-5 py-4 cursor-pointer hover:bg-paper ${!isRead&&tab==='inbox'?'bg-forest/5':''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isBroad?'bg-amber/20':'bg-forest/10'}`}>
                        {isBroad?<Globe className="w-4 h-4 text-amber"/>:<User className="w-4 h-4 text-forest"/>}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm truncate ${!isRead&&tab==='inbox'?'font-bold text-ink':'font-medium text-stone-700'}`}>
                          {msg.subject||'(no subject)'}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5 truncate">
                          {tab==='inbox'
                            ? `From: ${msg.sender?.name||'System'} (${ROLE_LABELS[msg.sender?.role]||msg.sender?.role||''})`
                            : `To: ${msg.recipient?.startsWith('BROADCAST_')?BROADCAST_OPTIONS.find(b=>b.value===msg.recipient)?.label||msg.recipient:msg.recipient}`
                          }
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5 line-clamp-1">{msg.body}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Pill tone={PRIORITY_TONE[msg.priority]||'stone'}>{msg.priority}</Pill>
                      <div className="text-[10px] text-stone-400">{fmtDateTime(msg.timestamp)}</div>
                      {!isRead&&tab==='inbox'&&<div className="w-2 h-2 rounded-full bg-forest"/>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Compose modal */}
      <Modal open={compose} onClose={()=>setCompose(false)} title="Compose Message" size="lg">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
        <div className="space-y-3">
          {/* Recipient type toggle */}
          <div>
            <label className="text-xs font-medium text-stone-600 mb-1.5 block">Send to</label>
            <div className="flex gap-2">
              {[['broadcast','Broadcast / Group'],['individual','Individual Person']].map(([v,l])=>(
                <button key={v} onClick={()=>s('recipientType',v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${form.recipientType===v?'bg-forest text-white border-forest':'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.recipientType==='broadcast' ? (
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">Broadcast group <span className="text-rust">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {broadcasts.map(opt=>(
                  <button key={opt.value} onClick={()=>s('recipient',opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all text-left ${form.recipient===opt.value?'bg-forest text-white border-forest':'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                    <span>{opt.icon}</span><span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">Search user <span className="text-rust">*</span></label>
              <Input icon={Search} placeholder="Search by name or username..." value={userQ} onChange={e=>setUserQ(e.target.value)}/>
              {users.length>0&&(
                <div className="mt-2 border border-stone-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {users.map(u=>(
                    <button key={u._id||u.id} onClick={()=>{s('individualId',u._id||u.id);s('recipient',u._id||u.id);setUserQ(u.name);setUsers([]);}}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-stone-50 text-left ${form.individualId===(u._id||u.id)?'bg-forest/10':''}`}>
                      <div>
                        <div className="font-medium text-ink">{u.name}</div>
                        <div className="text-xs text-stone-400">{ROLE_LABELS[u.role]||u.role} · @{u.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Input label="Subject" value={form.subject} onChange={e=>s('subject',e.target.value)} placeholder="Optional subject line"/>
          <div className="flex gap-3">
            <Select label="Priority" value={form.priority} onChange={e=>s('priority',e.target.value)} className="w-40"
              options={['low','normal','high','urgent'].map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)}))}/>
          </div>
          <Textarea label="Message" value={form.body} onChange={e=>s('body',e.target.value)} rows={5} required placeholder="Type your message here..."/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={()=>setCompose(false)} disabled={busy}>Cancel</Button>
            <Button icon={Send} onClick={send} disabled={busy||!form.body||!form.recipient}>{busy?'Sending...':'Send message'}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail?.subject||'(no subject)'} size="md">
        {detail&&(
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 border-b border-stone-100 pb-3">
              <span>From: <strong className="text-ink">{detail.sender?.name||'System'}</strong>{detail.sender?.role&&` (${ROLE_LABELS[detail.sender.role]||detail.sender.role})`}</span>
              <span>·</span>
              <span>{fmtDateTime(detail.timestamp)}</span>
              <Pill tone={PRIORITY_TONE[detail.priority]||'stone'}>{detail.priority}</Pill>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-700 whitespace-pre-line leading-relaxed min-h-[100px]">{detail.body}</div>
            <Button variant="secondary" size="sm" icon={Send} onClick={()=>{setDetail(null);setCompose(true);s('recipientType','individual');s('individualId',detail.sender?._id||detail.sender?.id);s('recipient',detail.sender?._id||detail.sender?.id);setUserQ(detail.sender?.name||'');setUsers([]);}}>
              Reply
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
