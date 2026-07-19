import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Camera, BarChart3, DollarSign, Eye, CalendarDays, Wallet, Plus, Trash2, Lock, Lightbulb, AlertTriangle, Pencil } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import { fmtDate, fmtNum, cedis, today } from '../../utils/format';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from 'recharts';

const BASE  = import.meta.env.VITE_BACKEND_URL || '';
const authH = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` });
const FOODS = ['Jollof Rice with Chicken','Banku with Okro Stew','Waakye with Fish and Egg','Kenkey with Fried Fish','Yam with Palaver Sauce','Rice and Stew with Egg','Beans Stew with Gari','Tuo Zaafi with Ayoyo Soup','Plantain with Beans','Fufu with Light Soup','Kontomire Stew with Rice','Ampesi with Kontomire','Fried Rice with Chicken','Groundnut Soup with Fufu'];
const CATS  = [
  { value:'ingredients', label:'🥕 Ingredients' },
  { value:'fuel',        label:'🔥 Fuel / Gas / Charcoal' },
  { value:'transport',   label:'🚚 Transport' },
  { value:'labour',      label:'👥 Labour / Helpers' },
  { value:'equipment',   label:'🍳 Equipment / Utensils' },
  { value:'other',       label:'📦 Other' },
];

export default function CatererDashboard({ view = 'overview' }) {
  const { user }    = useAuth();
  const [reports,  setRep]  = useState([]);
  const [payments, setPay]  = useState([]);
  const [school,   setSch]  = useState(null);
  const [form,     setForm] = useState({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() });
  const [photo,    setPhoto]= useState(null);
  const [photo2,   setPhoto2]= useState(null);
  const [editRep,  setEditRep]= useState(null);
  const [preview,  setPrev] = useState(false);
  const [selfModal,setSelf] = useState(false);
  const [selfForm, setSF]   = useState({ period:'', receivedAmount:'', receivedDate:'', reference:'' });
  const [busy,     setBusy] = useState(false);
  const [ok,       setOk]   = useState(null);
  const [err,      setErr]  = useState(null);
  // Timetable
  const [tt,       setTt]   = useState(null);
  const [ttMonth,  setTtMonth]= useState(new Date().toISOString().slice(0,7));
  // Expenditure
  const [exps,     setExps] = useState([]);
  const [guide,    setGuide]= useState(null);
  const [expMonth, setExpMonth]= useState(new Date().toISOString().slice(0,7));
  const [expModal, setExpModal]= useState(false);
  const [expForm,  setExpForm]= useState({ date:today(), category:'ingredients', item:'', amount:'', notes:'' });

  const load = useCallback(()=>{
    Promise.allSettled([
      api.reports.list({ limit:90 }),
      api.payments.list(),
      api.schools.get(user.school_id),
    ]).then(([r,p,s])=>{
      if(r.status==='fulfilled') setRep(r.value?.reports||[]);
      if(p.status==='fulfilled') setPay((p.value?.payments||[]).filter(pay=>pay.visible_to_caterer||pay.national_finance_approved));
      if(s.status==='fulfilled') setSch(s.value?.school||null);
    });
  },[user.school_id]);
  useEffect(()=>{ load(); },[load]);

  // Timetable loader
  useEffect(()=>{
    fetch(`${BASE}/api/timetable?month=${ttMonth}`, { headers:authH() })
      .then(r=>r.ok?r.json():{timetable:null}).then(d=>setTt(d.timetable||null)).catch(()=>setTt(null));
  },[ttMonth]);

  // Expenditure loader
  const loadExp = useCallback(()=>{
    fetch(`${BASE}/api/expenditure?month=${expMonth}`, { headers:authH() })
      .then(r=>r.ok?r.json():{expenditures:[]}).then(d=>setExps(d.expenditures||[])).catch(()=>setExps([]));
    fetch(`${BASE}/api/expenditure/guidance?month=${expMonth}`, { headers:authH() })
      .then(r=>r.ok?r.json():null).then(setGuide).catch(()=>setGuide(null));
  },[expMonth]);
  useEffect(()=>{ if(view==='expenses') loadExp(); },[view, loadExp]);

  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const handlePreview = (e) => {
    e.preventDefault();
    if (!form.foodType)    { setErr('Please select food type'); return; }
    if (!form.studentsFed) { setErr('Please enter number of pupils fed'); return; }
    if (Number(form.studentsFed) < 1) { setErr('Number of pupils must be at least 1'); return; }
    if (school?.enrolled && Number(form.studentsFed) > school.enrolled) {
      setErr(`⚠ You entered ${form.studentsFed} pupils but only ${school.enrolled} are enrolled.`); return;
    }
    setErr(null); setPrev(true);
  };

  const handleConfirmedSubmit = async () => {
    setBusy(true); setErr(null);
    try {
      if (editRep) {
        // EDIT & RESUBMIT
        const res = await fetch(`${BASE}/api/reports/${editRep._id||editRep.id}`, {
          method:'PATCH', headers:authH(),
          body:JSON.stringify({ food_type:form.foodType, students_fed:Number(form.studentsFed),
            time_ready:form.timeReady, time_served:form.timeServed, notes:form.notes, date:form.date }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error||'Resubmit failed');
        setOk('Report edited and resubmitted! Awaiting headmaster review.');
      } else {
        const fields = { foodType:form.foodType, studentsFed:form.studentsFed, timeReady:form.timeReady,
          timeServed:form.timeServed, notes:form.notes, date:form.date };
        await api.reports.create(fields, photo);
        setOk('Report submitted! Awaiting headmaster review.');
      }
      setForm({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() });
      setPhoto(null); setPhoto2(null); setPrev(false); setEditRep(null); load();
    } catch(e) { setErr(e.message); setPrev(false); } finally { setBusy(false); }
  };

  const startEdit = (r) => {
    setEditRep(r);
    setForm({ foodType:r.food_type, studentsFed:String(r.students_fed), timeReady:r.time_ready||'',
      timeServed:r.time_served||'', notes:r.notes||'', date:r.date });
    setErr(null); setOk(null);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const submitSelf = async () => {
    setBusy(true);
    try { await api.payments.selfReport(selfForm); setSelf(false); load(); setOk('Payment record submitted!'); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const addExp = async () => {
    if (!expForm.item||!expForm.amount) { setErr('Item and amount required'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`${BASE}/api/expenditure`, { method:'POST', headers:authH(), body:JSON.stringify(expForm) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error||'Failed');
      setExpModal(false); setExpForm({ date:today(), category:'ingredients', item:'', amount:'', notes:'' });
      loadExp();
    } catch(e){ setErr(e.message); } finally { setBusy(false); }
  };

  const delExp = async (id) => {
    await fetch(`${BASE}/api/expenditure/${id}`, { method:'DELETE', headers:authH() });
    loadExp();
  };

  const todayReport   = reports.find(r=>r.date===today()&&r.status!=='rejected');
  const rejectedToday = reports.find(r=>r.date===today()&&r.status==='rejected');
  const approved      = reports.filter(r=>r.status==='approved');
  const totalMeals    = approved.reduce((s,r)=>s+r.students_fed,0);
  const totalArrears  = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const totalPaid     = payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const compRate      = reports.length>0?Math.round(approved.length/reports.length*100):0;
  const badge         = compRate>=95?{label:'Outstanding',emoji:'🌟'}:compRate>=85?{label:'Excellent',emoji:'🥇'}:compRate>=70?{label:'Good',emoji:'🥈'}:{label:'Needs Improvement',emoji:'⚠️'};

  const weekData = Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.toISOString().split('T')[0];
    const rep=reports.find(r=>r.date===ds&&r.status==='approved');
    return { day:d.toLocaleDateString('en-GH',{weekday:'short'}), fed:rep?.students_fed||0 };
  }).reverse();

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

  /* ══════════ EXPENSES VIEW (private office) ══════════ */
  if (view==='expenses') {
    const statusTone = guide?.status==='over_budget'?'rust':guide?.status==='warning'?'amber':'emerald';
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22,#1e3317)'}}>
          <h1 className="font-serif text-xl font-bold text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-green-300"/>My Expenditure Office</h1>
          <p className="text-white/50 text-sm">Private financial records — visible to you only</p>
        </div>

        <div className="p-3 bg-navy/5 border border-navy/15 rounded-xl flex items-center gap-2 text-xs text-navy font-medium">
          <Lock className="w-3.5 h-3.5 flex-shrink-0"/>
          Private Office — only you ({user.name}) can see this. No officer or other caterer has access.
        </div>

        {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

        {guide && (
          <Card className={`border-2 ${statusTone==='rust'?'border-rust/30 bg-rust/5':statusTone==='amber'?'border-amber/30 bg-amber/5':'border-emerald/30 bg-emerald/5'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-ink flex items-center gap-2">
                {statusTone==='rust'?<AlertTriangle className="w-4 h-4 text-rust"/>:statusTone==='amber'?<TrendingUp className="w-4 h-4 text-amber rotate-180"/>:<CheckCircle2 className="w-4 h-4 text-emerald"/>}
                Budget Health — {expMonth}
              </h3>
              <Pill tone={statusTone}>{guide.status==='over_budget'?'OVER BUDGET':guide.status==='warning'?'CAUTION':'HEALTHY'}</Pill>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[['Expected Income',cedis(guide.expected_income)],['Total Spent',cedis(guide.total_spent)],
                ['Balance',cedis(guide.balance)],['Spend Ratio',`${guide.spend_ratio}%`]].map(([l,v])=>(
                <div key={l} className="bg-white rounded-xl p-3 border border-stone-100">
                  <div className="text-xs text-stone-400">{l}</div>
                  <div className={`font-bold font-serif ${l==='Balance'&&guide.balance<0?'text-rust':'text-ink'}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="h-2.5 bg-stone-100 rounded-full mb-3">
              <div className={`h-full rounded-full ${statusTone==='rust'?'bg-rust':statusTone==='amber'?'bg-amber':'bg-emerald'}`}
                style={{width:`${Math.min(100,guide.spend_ratio||0)}%`}}/>
            </div>
            {guide.tips?.map((t,i)=>(
              <div key={i} className="flex items-start gap-2 text-xs text-stone-600 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5"/>{t}
              </div>
            ))}
          </Card>
        )}

        <Card noPadding>
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-ink">Expenditure Records</h3>
            <div className="flex items-center gap-2">
              <input type="month" value={expMonth} onChange={e=>setExpMonth(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5"/>
              <Button icon={Plus} size="sm" onClick={()=>{ setExpModal(true); setErr(null); }}>Add</Button>
            </div>
          </div>
          {exps.length===0 ? <p className="p-8 text-center text-stone-300 text-sm">No expenditures recorded for {expMonth}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Item</th><th className="text-right px-4 py-3">Amount</th><th className="px-4 py-3"/></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {exps.map(e=>(
                    <tr key={e._id} className="hover:bg-paper">
                      <td className="px-4 py-2.5 text-xs text-stone-500">{fmtDate(e.date)}</td>
                      <td className="px-4 py-2.5 text-xs">{CATS.find(c=>c.value===e.category)?.label||e.category}</td>
                      <td className="px-4 py-2.5 text-xs text-ink">{e.item}{e.notes&&<span className="text-stone-400 italic ml-1">({e.notes})</span>}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-xs">{cedis(e.amount)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={()=>delExp(e._id)} className="text-stone-300 hover:text-rust"><Trash2 className="w-3.5 h-3.5"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Modal open={expModal} onClose={()=>setExpModal(false)} title="Record Expenditure" size="sm">
          {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
          <div className="space-y-3">
            <Input label="Date *" type="date" value={expForm.date} onChange={e=>setExpForm(f=>({...f,date:e.target.value}))}/>
            <Select label="Category *" value={expForm.category} onChange={e=>setExpForm(f=>({...f,category:e.target.value}))} options={CATS}/>
            <Input label="Item / description *" value={expForm.item} onChange={e=>setExpForm(f=>({...f,item:e.target.value}))} placeholder="e.g. 2 bags of rice"/>
            <Input label="Amount (GHS) *" type="number" step="0.01" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))}/>
            <Input label="Notes (optional)" value={expForm.notes} onChange={e=>setExpForm(f=>({...f,notes:e.target.value}))}/>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>setExpModal(false)} disabled={busy}>Cancel</Button>
              <Button onClick={addExp} disabled={busy||!expForm.item||!expForm.amount}>{busy?'Saving...':'Save Record'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  /* ══════════ PAYMENTS VIEW ══════════ */
  if (view==='payments') return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <div className="relative z-10 flex items-center justify-between">
          <div><h2 className="font-serif text-xl font-bold text-white">Payment Records</h2>
            <p className="text-white/50 text-sm">Only nationally-approved payments are shown</p></div>
          <Button icon={CreditCard} onClick={()=>setSelf(true)} size="sm">Report Receipt</Button>
        </div>
      </div>
      {payments.length===0?(
        <Card>
          <div className="text-center py-10">
            <Clock className="w-10 h-10 text-stone-200 mx-auto mb-3"/>
            <p className="font-semibold text-stone-500">No approved payments yet</p>
            <p className="text-sm text-stone-400 mt-1">Payments appear after District → Regional → National approval.</p>
          </div>
        </Card>
      ):(
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-left px-4 py-3">Period</th><th className="text-right px-4 py-3">Days Covered</th><th className="text-right px-4 py-3">Days Paid</th><th className="text-right px-4 py-3">Arrears Days</th><th className="text-right px-4 py-3">Amount Paid</th><th className="text-right px-4 py-3">Arrears (GHS)</th><th className="text-center px-4 py-3">Status</th><th className="text-center px-4 py-3">Chain</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {payments.map(p=>(
                  <tr key={p._id||p.id} className="hover:bg-paper">
                    <td className="px-4 py-2.5 text-xs font-medium">{p.period}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{p.days_covered}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-emerald font-semibold">{p.days_paid}</td>
                    <td className={`px-4 py-2.5 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-bold':''}`}>{p.days_arrears}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-xs">{cedis(p.amount_paid)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono text-xs ${p.arrears_amount>0?'text-rust font-bold':''}`}>{cedis(p.arrears_amount)}</td>
                    <td className="px-4 py-2.5 text-center"><Pill tone={p.status==='fully-paid'?'emerald':'rust'}>{p.status}</Pill></td>
                    <td className="px-4 py-2.5 text-center text-xs">
                      <span className={p.district_finance_approved?'text-emerald font-bold':'text-stone-300'}>D</span>
                      <span className="text-stone-200 mx-0.5">→</span>
                      <span className={p.regional_finance_approved?'text-emerald font-bold':'text-stone-300'}>R</span>
                      <span className="text-stone-200 mx-0.5">→</span>
                      <span className={p.national_finance_approved?'text-emerald font-bold':'text-stone-300'}>N</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal open={selfModal} onClose={()=>setSelf(false)} title="Report Payment Received" size="sm">
        <div className="space-y-3">
          <Input label="Period *" value={selfForm.period} onChange={e=>setSF(f=>({...f,period:e.target.value}))} placeholder="2025/2026 - Term 1"/>
          <Input label="Amount received (GHS) *" type="number" value={selfForm.receivedAmount} onChange={e=>setSF(f=>({...f,receivedAmount:e.target.value}))}/>
          <Input label="Date received" type="date" value={selfForm.receivedDate} onChange={e=>setSF(f=>({...f,receivedDate:e.target.value}))}/>
          <Input label="Bank reference #" value={selfForm.reference} onChange={e=>setSF(f=>({...f,reference:e.target.value}))}/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setSelf(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submitSelf} disabled={busy||!selfForm.period||!selfForm.receivedAmount}>{busy?'Saving...':'Submit'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  /* ══════════ HISTORY VIEW (with Edit buttons) ══════════ */
  if (view==='history') return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <h2 className="font-serif text-xl font-bold text-white">My Report History</h2>
        <p className="text-white/50 text-sm">{reports.length} total · {compRate}% compliance · You can edit pending or rejected reports</p>
      </div>
      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm">{ok}</div>}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Food</th><th className="text-right px-4 py-3">Pupils Fed</th><th className="text-center px-4 py-3">Status</th><th className="text-left px-4 py-3">Comment</th><th className="px-4 py-3"/></tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {reports.map(r=>(
                <tr key={r._id||r.id} className={r.status==='rejected'?'bg-rust/5':''}>
                  <td className="px-4 py-2.5 text-xs text-stone-500">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5 text-xs text-ink max-w-[160px] truncate">{r.food_type}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-xs">{fmtNum(r.students_fed)}</td>
                  <td className="px-4 py-2.5 text-center"><Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill></td>
                  <td className="px-4 py-2.5 text-xs text-stone-400 italic">{r.headmaster_comment||'—'}</td>
                  <td className="px-4 py-2.5">
                    {['pending','rejected'].includes(r.status)&&(
                      <button onClick={()=>startEdit(r)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber/10 text-amber text-xs rounded-lg font-bold hover:bg-amber/20">
                        <Pencil className="w-3 h-3"/>Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-stone-300 text-sm">No reports yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Edit modal opens same form via overview redirect */}
      {editRep&&(
        <Card className="border-2 border-amber/30">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Pencil className="w-4 h-4 text-amber"/>Editing Report — {fmtDate(editRep.date)}</h3>
          {err&&<div className="mb-4 p-3 bg-rust/10 text-rust rounded-xl text-sm">{err}</div>}
          <ReportForm form={form} s={s} school={school} photo={photo} setPhoto={setPhoto}
            onSubmit={handlePreview} submitLabel="Preview Changes →" allowPastDate/>
          <button onClick={()=>{ setEditRep(null); setForm({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() }); }}
            className="mt-2 text-xs text-stone-400 hover:text-rust">Cancel edit</button>
        </Card>
      )}
      <PreviewModal open={preview} onClose={()=>setPrev(false)} form={form} school={school}
        photo={photo} err={err} busy={busy} onConfirm={handleConfirmedSubmit} isEdit={!!editRep}/>
    </div>
  );

  /* ══════════ OVERVIEW ══════════ */
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><ClipboardList className="w-4 h-4 text-green-300/70"/><span className="text-[10px] font-bold tracking-widest text-green-300/50 uppercase">Caterer Portal</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{school?.name||'Loading...'} · {fmtNum(school?.enrolled||0)} enrolled</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <span className="text-lg">{badge.emoji}</span><span className="text-xs font-bold text-white">{badge.label}</span>
              <span className="text-xs text-white/50">— {compRate}% compliance</span>
            </div>
          </div>
          <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

      {todayReport?.status==='approved'&&(
        <div className="p-4 bg-emerald/10 border-2 border-emerald/30 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald"/><div><p className="font-semibold text-emerald">Today's report approved ✓</p><p className="text-sm text-stone-500">{fmtNum(todayReport.students_fed)} pupils · {todayReport.food_type}</p></div>
        </div>
      )}
      {todayReport?.status==='pending'&&(
        <div className="p-4 bg-amber/10 border-2 border-amber/30 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber"/><div><p className="font-semibold text-amber">Awaiting headmaster review...</p><p className="text-sm text-stone-500">{fmtNum(todayReport.students_fed)} pupils · {todayReport.food_type}</p></div>
          </div>
          <button onClick={()=>startEdit(todayReport)} className="flex items-center gap-1 px-3 py-1.5 bg-amber/20 text-amber text-xs rounded-xl font-bold hover:bg-amber/30">
            <Pencil className="w-3 h-3"/>Edit
          </button>
        </div>
      )}
      {rejectedToday&&(
        <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-2xl">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2"><XCircle className="w-5 h-5 text-rust"/><p className="font-bold text-rust">Today's report was rejected</p></div>
            <button onClick={()=>startEdit(rejectedToday)} className="flex items-center gap-1 px-3 py-1.5 bg-rust/20 text-rust text-xs rounded-xl font-bold hover:bg-rust/30">
              <Pencil className="w-3 h-3"/>Edit & Resubmit
            </button>
          </div>
          <p className="text-sm text-stone-600">"{rejectedToday.headmaster_comment}"</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Reports"      value={fmtNum(reports.length)}     icon={ClipboardList} tone="navy"/>
        <KPI label="Approved"     value={fmtNum(approved.length)}    icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Total Meals"  value={fmtNum(totalMeals)}         icon={TrendingUp}    tone="forest"/>
        <KPI label="Amount Paid"  value={cedis(totalPaid)}            icon={DollarSign}    tone="amber"/>
        <KPI label="Arrears"      value={cedis(totalArrears)}         icon={CreditCard}    tone={totalArrears>0?'rust':'emerald'}/>
      </div>

      {/* ── FOOD TIMETABLE ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink flex items-center gap-2"><CalendarDays className="w-4 h-4 text-forest"/>Monthly Food Timetable</h3>
          <input type="month" value={ttMonth} onChange={e=>setTtMonth(e.target.value)}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1.5"/>
        </div>
        {!tt ? (
          <p className="text-sm text-stone-300 text-center py-6">
            No timetable posted for this month yet.<br/>
            <span className="text-xs">Your District Feeding Coordinator posts the official menu.</span>
          </p>
        ) : (
          <div className="space-y-2">
            {DAYS.map(day=>{
              const items = (tt.menu||[]).filter(m=>m.day===day);
              return (
                <div key={day} className="flex items-start gap-3 p-3 bg-forest/5 border border-forest/15 rounded-xl">
                  <div className="w-24 flex-shrink-0 text-xs font-bold text-forest uppercase tracking-wide pt-0.5">{day}</div>
                  <div className="flex-1">
                    {items.length===0
                      ? <span className="text-xs text-stone-300">—</span>
                      : items.map((m,i)=>(
                        <div key={i} className="text-sm text-ink flex items-center gap-2">
                          {m.week>0&&<span className="text-[10px] font-bold text-amber">W{m.week}</span>}
                          {m.food}
                          {m.notes&&<span className="text-xs text-stone-400 italic">({m.notes})</span>}
                          <button onClick={()=>s('foodType', m.food)} className="text-[10px] text-forest underline ml-auto">Use this</button>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-stone-400 text-right">Posted by {tt.posted_by_name}</p>
          </div>
        )}
      </Card>

      {/* Weekly chart */}
      <Card>
        <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-forest"/>Weekly Feeding Count</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="day" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
            <Tooltip formatter={v=>[fmtNum(v),'Pupils Fed']}/>
            <Bar dataKey="fed" radius={[4,4,0,0]}>{weekData.map((d,i)=><Cell key={i} fill={d.fed>0?'#15493B':'#f1f5f9'}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Submit / edit form */}
      {(!todayReport||rejectedToday||editRep)&&(
        <Card className={editRep?'border-2 border-amber/30':''}>
          <h3 className="font-semibold text-ink mb-5 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-forest"/>
            {editRep?`Editing Report — ${fmtDate(editRep.date)}`:rejectedToday?'Resubmit Today\'s Report':'Submit Daily Feeding Report'}
          </h3>
          {err&&<div className="mb-4 p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
          <ReportForm form={form} s={s} school={school} photo={photo} setPhoto={setPhoto}
            onSubmit={handlePreview} submitLabel={editRep?'Preview Changes →':'Preview Before Submitting →'} allowPastDate/>
          {editRep&&<button onClick={()=>{ setEditRep(null); setForm({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() }); }}
            className="mt-2 text-xs text-stone-400 hover:text-rust">Cancel edit</button>}
        </Card>
      )}

      {/* Recent reports with edit */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">Recent Reports</h3></div>
        {reports.length===0?<p className="p-8 text-center text-stone-300 text-sm">No reports yet</p>:(
          <div className="divide-y divide-stone-50">
            {reports.slice(0,8).map(r=>(
              <div key={r._id||r.id} className={`flex items-center justify-between px-5 py-3 ${r.status==='rejected'?'bg-rust/5':''}`}>
                <div>
                  <div className="text-sm font-medium text-ink">{fmtDate(r.date)}</div>
                  <div className="text-xs text-stone-400">{r.food_type} · {fmtNum(r.students_fed)} pupils</div>
                  {r.headmaster_comment&&r.status!=='pending'&&<div className="text-xs text-stone-400 italic">"{r.headmaster_comment}"</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
                  {['pending','rejected'].includes(r.status)&&(
                    <button onClick={()=>startEdit(r)} className="p-1.5 text-amber hover:bg-amber/10 rounded-lg"><Pencil className="w-3.5 h-3.5"/></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PreviewModal open={preview} onClose={()=>setPrev(false)} form={form} school={school}
        photo={photo} err={err} busy={busy} onConfirm={handleConfirmedSubmit} isEdit={!!editRep}/>
    </div>
  );
}

/* ── Shared form component ─────────────────────────────── */
function ReportForm({ form, s, school, photo, setPhoto, onSubmit, submitLabel, allowPastDate }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Date (today or previous days)" type="date" value={form.date} onChange={e=>s('date',e.target.value)} required
          max={today()} min={allowPastDate?undefined:today()}/>
        <Input label="Pupils fed *" type="number" value={form.studentsFed} onChange={e=>s('studentsFed',e.target.value)} required
          placeholder={`Max: ${fmtNum(school?.enrolled||0)}`} min="1"/>
      </div>
      <div>
        <label className="text-xs font-medium text-stone-600 mb-1.5 block">Food served * (from timetable or type your own)</label>
        <input list="cat-foods" value={form.foodType} onChange={e=>s('foodType',e.target.value)}
          placeholder="Select from timetable or type food served..."
          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-forest" required/>
        <datalist id="cat-foods">{FOODS.map(f=><option key={f} value={f}/>)}</datalist>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Time food was ready" type="time" value={form.timeReady} onChange={e=>s('timeReady',e.target.value)}/>
        <Input label="Time food was served" type="time" value={form.timeServed} onChange={e=>s('timeServed',e.target.value)}/>
      </div>
      <Textarea label="Notes (optional)" value={form.notes} onChange={e=>s('notes',e.target.value)} rows={2}/>
      <div>
        <label className="text-xs font-medium text-stone-600 mb-1.5 block">Photo of food served (required daily)</label>
        <label htmlFor="photo-cat" className="flex items-center gap-3 p-3 border-2 border-dashed border-stone-200 rounded-xl hover:border-forest/40 cursor-pointer">
          <Camera className="w-5 h-5 text-stone-400"/>
          {photo?<span className="text-sm text-emerald">✓ {photo.name}</span>:<span className="text-sm text-stone-400">Click to upload photo of the food</span>}
        </label>
        <input id="photo-cat" type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} className="hidden"/>
      </div>
      <Button type="submit" disabled={!form.foodType||!form.studentsFed} className="w-full" icon={Eye} size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}

/* ── Preview modal ─────────────────────────────────────── */
function PreviewModal({ open, onClose, form, school, photo, err, busy, onConfirm, isEdit }) {
  return (
    <Modal open={open} onClose={onClose} title={isEdit?'Confirm Your Changes':'Confirm Your Report'} size="md">
      <div className="space-y-4">
        <div className="bg-forest/5 border-2 border-forest/20 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[['Date',fmtDate(form.date)],['Food Served',form.foodType],['Pupils Fed',fmtNum(Number(form.studentsFed))],['School Enrolled',fmtNum(school?.enrolled||0)],['Time Ready',form.timeReady||'—'],['Time Served',form.timeServed||'—']].map(([l,v])=>(
              <div key={l} className="bg-white rounded-xl p-3 border border-stone-100">
                <div className="text-xs text-stone-400">{l}</div>
                <div className="font-semibold text-ink">{v}</div>
              </div>
            ))}
          </div>
          {form.notes&&<div className="bg-white rounded-xl p-3 border border-stone-100"><div className="text-xs text-stone-400">Notes</div><div className="text-sm italic text-stone-600">{form.notes}</div></div>}
          {photo&&<div className="bg-white rounded-xl p-3 border border-stone-100"><div className="text-xs text-stone-400">Photo</div><div className="text-sm text-emerald">✓ {photo.name}</div></div>}
        </div>
        <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500">
          By confirming, you certify this information is accurate. False reports are subject to disciplinary action.
        </div>
        {err&&<div className="text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>← Edit</Button>
          <Button onClick={onConfirm} disabled={busy} icon={CheckCircle2}>
            {busy?'Submitting...':isEdit?'Confirm & Resubmit':'Confirm & Submit'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}