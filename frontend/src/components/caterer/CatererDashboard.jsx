import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, BookOpen, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Camera, Award, Target, Zap, BarChart3, DollarSign, Calendar, ChevronRight, Star } from 'lucide-react';
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
import { fmtDate, fmtNum, cedis, today, ROLE_LABELS } from '../../utils/format';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const FOODS = [
  'Jollof Rice with Chicken','Banku with Okro Stew','Waakye with Fish and Egg',
  'Kenkey with Fried Fish','Yam with Palaver Sauce','Rice and Stew with Egg',
  'Beans Stew with Gari','Tuo Zaafi with Ayoyo Soup','Plantain with Beans',
  'Fufu with Light Soup','Kontomire Stew with Rice','Ampesi with Kontomire',
  'Fried Rice with Chicken','Groundnut Soup with Fufu','Ayoyo Soup with Tuo Zaafi',
];

function StatusBanner({ todayReport, rejectedToday }) {
  if (todayReport?.status === 'approved') return (
    <div className="p-4 bg-emerald/10 border-2 border-emerald/30 rounded-2xl flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald flex-shrink-0"/>
      <div><p className="font-semibold text-emerald">Today's report approved! ✓</p><p className="text-sm text-stone-500 mt-0.5">Headmaster confirmed {fmtNum(todayReport.students_fed)} pupils fed · {todayReport.food_type}</p></div>
    </div>
  );
  if (todayReport?.status === 'pending') return (
    <div className="p-4 bg-amber/10 border-2 border-amber/30 rounded-2xl flex items-center gap-3">
      <Clock className="w-5 h-5 text-amber flex-shrink-0"/>
      <div><p className="font-semibold text-amber">Awaiting headmaster review...</p><p className="text-sm text-stone-500 mt-0.5">{fmtNum(todayReport.students_fed)} pupils · {todayReport.food_type}</p></div>
    </div>
  );
  if (rejectedToday) return (
    <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-2xl">
      <div className="flex items-center gap-2 mb-1"><XCircle className="w-5 h-5 text-rust"/><p className="font-semibold text-rust">Today's report was rejected</p></div>
      {rejectedToday.headmaster_comment && <p className="text-sm text-stone-600 mb-1">"{rejectedToday.headmaster_comment}"</p>}
      <p className="text-xs text-rust font-medium">→ Resubmit a corrected report below</p>
    </div>
  );
  return null;
}

function SubmitForm({ onSuccess, rejectedToday, school }) {
  const [form,  setForm]  = useState({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() });
  const [photo, setPhoto] = useState(null);
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState(null);
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.foodType||!form.studentsFed) { setErr('Food type and number of pupils are required'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api.reports.create(form, photo);
      setForm({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() });
      setPhoto(null); onSuccess(r);
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Card className={rejectedToday ? 'border-2 border-amber/30' : ''}>
      <h3 className="font-semibold text-ink mb-5 flex items-center gap-2">
        {rejectedToday
          ? <><RefreshCw className="w-4 h-4 text-amber"/>Resubmit Today's Report</>
          : <><ClipboardList className="w-4 h-4 text-forest"/>Submit Daily Feeding Report</>}
      </h3>
      {err&&<div className="mb-4 p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Date" type="date" value={form.date} onChange={e=>s('date',e.target.value)} required max={today()}/>
          <Input label="Pupils fed today *" type="number" value={form.studentsFed} onChange={e=>s('studentsFed',e.target.value)} required placeholder={`Max: ${fmtNum(school?.enrolled||0)} enrolled`} min="1"/>
        </div>
        <Select label="Food type served today *" value={form.foodType} onChange={e=>s('foodType',e.target.value)} required
          options={[{value:'',label:'Select food type...',disabled:true},...FOODS.map(f=>({value:f,label:f}))]}/>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Time food was ready" type="time" value={form.timeReady} onChange={e=>s('timeReady',e.target.value)}/>
          <Input label="Time food was served" type="time" value={form.timeServed} onChange={e=>s('timeServed',e.target.value)}/>
        </div>
        <Textarea label="Notes (optional)" value={form.notes} onChange={e=>s('notes',e.target.value)} rows={2} placeholder="Challenges, observations, special notes..."/>
        {/* Photo upload */}
        <div>
          <label className="text-xs font-medium text-stone-600 mb-1.5 block">Photo evidence (optional)</label>
          <label htmlFor="photo-cat" className="flex items-center gap-3 p-3 border-2 border-dashed border-stone-200 rounded-xl hover:border-forest/40 cursor-pointer transition-colors">
            <Camera className="w-5 h-5 text-stone-400 flex-shrink-0"/>
            {photo ? <span className="text-sm text-emerald font-medium">✓ {photo.name}</span>
              : <span className="text-sm text-stone-400">Click to upload photo</span>}
          </label>
          <input id="photo-cat" type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} className="hidden"/>
        </div>
        {/* Guidance */}
        <div className="bg-forest/5 border border-forest/15 rounded-xl p-3 text-xs text-stone-500">
          <strong className="text-forest">After submission:</strong> Your headmaster will review and approve or reject this report. You'll see the status update on your dashboard immediately.
        </div>
        <Button type="submit" disabled={busy||!form.foodType||!form.studentsFed} className="w-full" icon={rejectedToday?RefreshCw:ClipboardList} size="lg">
          {busy ? 'Submitting...' : rejectedToday ? 'Resubmit Corrected Report' : 'Submit Feeding Report'}
        </Button>
      </form>
    </Card>
  );
}

export default function CatererDashboard({ view = 'overview' }) {
  const { user }    = useAuth();
  const [reports,  setRep]  = useState([]);
  const [payments, setPay]  = useState([]);
  const [school,   setSch]  = useState(null);
  const [monthly,  setMon]  = useState([]);
  const [ok,       setOk]   = useState(null);
  const [selfModal,setSelf] = useState(false);
  const [selfForm, setSF]   = useState({ period:'', receivedAmount:'', receivedDate:'', reference:'' });
  const [busy,     setBusy] = useState(false);
  const [err,      setErr]  = useState(null);
  const [detModal, setDet]  = useState(null);
  const [ts,       setTs]   = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.reports.list({limit:90}),
      api.payments.list(),
      api.schools.get(user.school_id),
      api.analytics.monthly(),
    ]).then(([r,p,s,m])=>{
      if(r.status==='fulfilled') setRep(r.value?.reports||[]);
      if(p.status==='fulfilled') setPay(p.value?.payments||[]);
      if(s.status==='fulfilled') setSch(s.value?.school||null);
      if(m.status==='fulfilled') setMon(m.value?.monthly||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    }).catch(console.error);
  },[]);
  useEffect(()=>{ load(); },[]);

  const submitSelf = async () => {
    setBusy(true); setErr(null);
    try { await api.payments.selfReport(selfForm); setSelf(false); setSF({period:'',receivedAmount:'',receivedDate:'',reference:''}); load(); setOk('Payment record submitted!'); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const todayReport   = reports.find(r=>r.date===today()&&r.status!=='rejected');
  const rejectedToday = reports.find(r=>r.date===today()&&r.status==='rejected');
  const approved      = reports.filter(r=>r.status==='approved');
  const totalMeals    = approved.reduce((s,r)=>s+r.students_fed,0);
  const totalArrears  = payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
  const totalPaid     = payments.reduce((s,p)=>s+(p.amount_paid||0),0);
  const compRate      = reports.length>0?Math.round(approved.length/reports.length*100):0;

  // Weekly performance
  const weekData = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const rep = reports.find(r=>r.date===ds&&r.status==='approved');
    return { day:d.toLocaleDateString('en-GH',{weekday:'short'}), fed:rep?.students_fed||0, submitted:reports.some(r=>r.date===ds)?1:0 };
  }).reverse();

  // Food frequency
  const foodFreq = FOODS.map(f=>({ name:f.split(' ').slice(0,2).join(' '), count:reports.filter(r=>r.food_type===f).length })).filter(f=>f.count>0).sort((a,b)=>b.count-a.count).slice(0,5);

  // Performance badge
  const badge = compRate>=95?{label:'Outstanding',color:'#C9882C',emoji:'🌟'}:compRate>=85?{label:'Excellent',color:'#059669',emoji:'🥇'}:compRate>=70?{label:'Good',color:'#15493B',emoji:'🥈'}:{label:'Needs Improvement',color:'#C0392B',emoji:'⚠️'};

  if (view==='payments') return <PaymentsTab payments={payments} onRefresh={load} onSelfReport={()=>setSelf(true)} totalPaid={totalPaid} totalArrears={totalArrears}/>;
  if (view==='history')  return <HistoryTab reports={reports} compRate={compRate}/>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><ClipboardList className="w-4 h-4 text-green-300/70"/><span className="text-[10px] font-bold tracking-widest text-green-300/50 uppercase">Caterer Portal</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{school?.name||'Loading...'} · {fmtNum(school?.enrolled||0)} enrolled pupils</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <span className="text-lg">{badge.emoji}</span>
              <span className="text-xs font-bold text-white">{badge.label} Caterer</span>
              <span className="text-xs text-white/50">— {compRate}% compliance</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
          </div>
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 border border-emerald/20 rounded-xl text-sm text-emerald flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

      <StatusBanner todayReport={todayReport} rejectedToday={rejectedToday}/>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Reports Submitted" value={fmtNum(reports.length)}   icon={ClipboardList} tone="navy"/>
        <KPI label="Approved"          value={fmtNum(approved.length)}  icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Total Meals"       value={fmtNum(totalMeals)}       icon={TrendingUp}    tone="forest"/>
        <KPI label="Amount Paid"       value={cedis(totalPaid)}          icon={DollarSign}    tone="amber"/>
        <KPI label="Arrears"           value={cedis(totalArrears)}       icon={CreditCard}    tone={totalArrears>0?'rust':'emerald'}/>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-forest"/>Weekly Feeding Count</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="day" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:11}} tickFormatter={v=>v||''}/>
              <Tooltip formatter={v=>[fmtNum(v),'Pupils Fed']}/>
              <Bar dataKey="fed" name="fed" radius={[4,4,0,0]}>
                {weekData.map((d,i)=>( <Cell key={i} fill={d.fed>0?'#15493B':'#f1f5f9'}/> ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber"/>Most Served Foods</h3>
          {foodFreq.length===0
            ? <p className="text-stone-300 text-sm text-center py-12">Submit reports to see your food frequency</p>
            : <div className="space-y-3">
                {foodFreq.map((f,i)=>(
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-600 truncate max-w-[70%]">{f.name}</span>
                      <span className="font-bold text-forest">{f.count}×</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full">
                      <div className="h-full bg-forest rounded-full" style={{width:`${(f.count/foodFreq[0].count)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>

      {/* Monthly trend */}
      {monthly.length>0&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald"/>Monthly Meals Trend</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthly}>
              <defs><linearGradient id="catGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
              <Area type="monotone" dataKey="meals" stroke="#15493B" fill="url(#catGrad)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Submit form — only if no pending/approved today or there's a rejection */}
      {(!todayReport||rejectedToday)&&(
        <SubmitForm onSuccess={r=>{ setOk(r.is_resubmission?'Resubmitted!':'Report submitted! Awaiting headmaster review.'); load(); }} rejectedToday={rejectedToday} school={school}/>
      )}

      {/* Recent reports */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink">Recent Reports</h3>
          <Pill tone="stone">{reports.length} total</Pill>
        </div>
        {reports.length===0
          ? <p className="p-8 text-center text-stone-300 text-sm">No reports submitted yet</p>
          : (
            <div className="divide-y divide-stone-50">
              {reports.slice(0,8).map(r=>(
                <div key={r._id||r.id} className={`flex items-center justify-between px-5 py-3 hover:bg-paper cursor-pointer ${r.status==='rejected'?'bg-rust/5':''}`} onClick={()=>setDet(r)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{fmtDate(r.date)}</span>
                      {r.is_resubmission&&<span className="text-[10px] bg-amber/10 text-amber px-1.5 py-0.5 rounded-full">resubmitted</span>}
                    </div>
                    <div className="text-xs text-stone-400 truncate max-w-[280px]">{r.food_type} · {fmtNum(r.students_fed)} pupils</div>
                    {r.headmaster_comment&&r.status!=='pending'&&<div className="text-xs text-stone-400 italic">"{r.headmaster_comment}"</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
                    <ChevronRight className="w-4 h-4 text-stone-300"/>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Card>

      {/* Detail modal */}
      <Modal open={!!detModal} onClose={()=>setDet(null)} title="Report Details" size="md">
        {detModal&&(
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[['Date',fmtDate(detModal.date)],['Food',detModal.food_type],['Pupils Fed',fmtNum(detModal.students_fed)],['Time Ready',detModal.time_ready||'—'],['Time Served',detModal.time_served||'—'],['Status',detModal.status]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
              ))}
            </div>
            {detModal.notes&&<div className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">Your notes</div><div className="text-sm text-stone-600 italic">{detModal.notes}</div></div>}
            {detModal.headmaster_comment&&<div className={`rounded-xl p-3 ${detModal.status==='rejected'?'bg-rust/10':'bg-emerald/10'}`}><div className="text-xs text-stone-400">Headmaster's comment</div><div className="text-sm font-medium">{detModal.headmaster_comment}</div></div>}
          </div>
        )}
      </Modal>

      {/* Self-report payment modal */}
      <Modal open={selfModal} onClose={()=>setSelf(false)} title="Report Payment Received" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        <div className="space-y-3">
          <Input label="Period *" value={selfForm.period} onChange={e=>setSF(f=>({...f,period:e.target.value}))} placeholder="2025/2026 - Term 1" required/>
          <Input label="Amount received (GHS) *" type="number" value={selfForm.receivedAmount} onChange={e=>setSF(f=>({...f,receivedAmount:e.target.value}))} required/>
          <Input label="Date received" type="date" value={selfForm.receivedDate} onChange={e=>setSF(f=>({...f,receivedDate:e.target.value}))}/>
          <Input label="Bank reference #" value={selfForm.reference} onChange={e=>setSF(f=>({...f,reference:e.target.value}))} placeholder="e.g. GCB-TXN-2025-001"/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setSelf(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submitSelf} disabled={busy||!selfForm.period||!selfForm.receivedAmount}>{busy?'Saving...':'Submit'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── History Tab ──────────────────────────────────────────────────── */
function HistoryTab({ reports, compRate }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const approved  = reports.filter(r=>r.status==='approved').length;
  const rejected  = reports.filter(r=>r.status==='rejected').length;
  const pending   = reports.filter(r=>r.status==='pending').length;
  const totalMeals= reports.filter(r=>r.status==='approved').reduce((s,r)=>s+r.students_fed,0);

  const visible = reports.filter(r=>{
    if (filter && r.status!==filter) return false;
    if (search && !(r.food_type||'').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <div className="relative z-10">
          <h2 className="font-serif text-xl font-bold text-white">My Report History</h2>
          <p className="text-white/50 text-sm">All {reports.length} submitted reports · {compRate}% approval rate</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Total',reports.length,'navy'],['Approved',approved,'emerald'],['Pending',pending,'amber'],['Rejected',rejected,'rust']].map(([l,v,t])=>(
          <Card key={l} className="text-center py-3">
            <div className={`text-2xl font-bold font-serif text-${t}`}>{fmtNum(v)}</div>
            <div className="text-xs text-stone-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search food type..." className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-forest"/>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-forest bg-white">
          <option value="">All status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <Card noPadding>
        {visible.length===0?<div className="p-8 text-center text-stone-300 text-sm">No reports match your filters</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Food</th><th className="text-right px-4 py-3">Pupils Fed</th><th className="text-center px-4 py-3">Status</th><th className="text-left px-4 py-3">Comment</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visible.map(r=>(
                  <tr key={r._id||r.id} className={`hover:bg-paper ${r.status==='rejected'?'bg-rust/5':''}`}>
                    <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">
                      {fmtDate(r.date)}
                      {r.is_resubmission&&<span className="ml-1 text-[10px] bg-amber/10 text-amber px-1 py-0.5 rounded">resubmitted</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink max-w-[180px] truncate">{r.food_type}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-xs text-forest">{fmtNum(r.students_fed)}</td>
                    <td className="px-4 py-3 text-center"><Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill></td>
                    <td className="px-4 py-3 text-xs text-stone-500 italic max-w-[200px] truncate">{r.headmaster_comment||'—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-stone-50">
                <tr><td colSpan={2} className="px-4 py-2 text-xs font-semibold text-stone-500">Showing {visible.length} of {reports.length}</td>
                <td className="px-4 py-2 text-right text-xs font-bold text-forest">{fmtNum(visible.filter(r=>r.status==='approved').reduce((s,r)=>s+r.students_fed,0))} meals</td><td colSpan={2}/></tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Payments Tab ─────────────────────────────────────────────────── */
function PaymentsTab({ payments, onRefresh, onSelfReport, totalPaid, totalArrears }) {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-white">Payment Records</h2>
            <p className="text-white/50 text-sm">GHS 2.00 per pupil per day · {payments.length} records</p>
          </div>
          <Button icon={CreditCard} onClick={onSelfReport} size="sm">Report Receipt</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Paid',    cedis(totalPaid),    'emerald'],
          ['Total Arrears', cedis(totalArrears), totalArrears>0?'rust':'emerald'],
          ['Records',       fmtNum(payments.length), 'navy'],
          ['Fully Paid',    fmtNum(payments.filter(p=>p.status==='fully-paid').length), 'forest'],
        ].map(([l,v,t])=>(
          <Card key={l} className="text-center py-3">
            <div className={`text-xl font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-xs text-stone-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      {totalArrears>0&&(
        <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rust flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-rust">Outstanding arrears: {cedis(totalArrears)}</p>
            <p className="text-sm text-stone-600 mt-0.5">Contact your district finance officer to follow up on payment of arrears.</p>
          </div>
        </div>
      )}

      {payments.length===0
        ? <Card><div className="p-8 text-center text-stone-300 text-sm">No payment records yet</div></Card>
        : (
          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="text-left px-4 py-3">Period</th>
                    <th className="text-right px-4 py-3">Days Covered</th>
                    <th className="text-right px-4 py-3">Days Paid</th>
                    <th className="text-right px-4 py-3">Arrears Days</th>
                    <th className="text-right px-4 py-3">Amount Paid</th>
                    <th className="text-right px-4 py-3">Arrears (GHS)</th>
                    <th className="text-center px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {payments.map(p=>(
                    <tr key={p._id||p.id} className="hover:bg-paper">
                      <td className="px-4 py-3 text-xs font-medium">{p.period}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{p.days_covered}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald font-semibold">{p.days_paid}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${p.days_arrears>0?'text-rust font-bold':''}`}>{p.days_arrears}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-xs">{cedis(p.amount_paid)}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${p.arrears_amount>0?'text-rust font-bold':''}`}>{cedis(p.arrears_amount)}</td>
                      <td className="px-4 py-3 text-center"><Pill tone={p.status==='fully-paid'?'emerald':'rust'}>{p.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-stone-500 text-xs">TOTALS</td>
                    <td className="px-4 py-3 text-right text-emerald font-bold text-xs">{cedis(totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-rust font-bold text-xs">{cedis(totalArrears)}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )
      }
    </div>
  );
}
