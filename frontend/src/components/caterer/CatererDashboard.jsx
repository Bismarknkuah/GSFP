import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Camera, Award, BarChart3, DollarSign, Star, Eye } from 'lucide-react';
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
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from 'recharts';

const BASE = import.meta.env.VITE_BACKEND_URL || '';
const FOODS = ['Jollof Rice with Chicken','Banku with Okro Stew','Waakye with Fish and Egg','Kenkey with Fried Fish','Yam with Palaver Sauce','Rice and Stew with Egg','Beans Stew with Gari','Tuo Zaafi with Ayoyo Soup','Plantain with Beans','Fufu with Light Soup','Kontomire Stew with Rice','Ampesi with Kontomire','Fried Rice with Chicken','Groundnut Soup with Fufu'];

export default function CatererDashboard({ view = 'overview' }) {
  const { user }    = useAuth();
  const [reports,  setRep]  = useState([]);
  const [payments, setPay]  = useState([]);
  const [school,   setSch]  = useState(null);
  const [monthly,  setMon]  = useState([]);
  const [form,     setForm] = useState({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() });
  const [photo,    setPhoto]= useState(null);
  const [preview,  setPrev] = useState(false); // ← PREVIEW MODAL
  const [selfModal,setSelf] = useState(false);
  const [selfForm, setSF]   = useState({ period:'', receivedAmount:'', receivedDate:'', reference:'' });
  const [busy,     setBusy] = useState(false);
  const [ok,       setOk]   = useState(null);
  const [err,      setErr]  = useState(null);
  const [ts,       setTs]   = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.reports.list({ limit:90 }),
      api.payments.list(),
      api.schools.get(user.school_id),
      api.analytics.monthly(),
    ]).then(([r,p,s,m])=>{
      if(r.status==='fulfilled') setRep(r.value?.reports||[]);
      // Caterers only see nationally-approved payments
      if(p.status==='fulfilled') setPay((p.value?.payments||[]).filter(pay=>pay.visible_to_caterer||pay.national_finance_approved));
      if(s.status==='fulfilled') setSch(s.value?.school||null);
      if(m.status==='fulfilled') setMon(m.value?.monthly||[]);
      setTs(new Date().toLocaleTimeString('en-GH'));
    });
  },[user.school_id]);

  useEffect(()=>{ load(); },[load]);

  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  // Step 1 — validate and show preview
  const handlePreview = (e) => {
    e.preventDefault();
    if (!form.foodType)    { setErr('Please select food type'); return; }
    if (!form.studentsFed) { setErr('Please enter number of pupils fed'); return; }
    if (Number(form.studentsFed) < 1) { setErr('Number of pupils must be at least 1'); return; }
    if (school?.enrolled && Number(form.studentsFed) > school.enrolled) {
      setErr(`⚠ You entered ${form.studentsFed} pupils but only ${school.enrolled} are enrolled. Please correct this.`); return;
    }
    setErr(null);
    setPrev(true); // Show preview
  };

  // Step 2 — confirmed submit
  const handleConfirmedSubmit = async () => {
    setBusy(true); setErr(null);
    try {
      const result = await api.reports.create(form, photo);
      setOk(result?.is_resubmission ? 'Report resubmitted! Awaiting headmaster review.' : 'Report submitted! Awaiting headmaster review.');
      setForm({ foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() });
      setPhoto(null); setPrev(false); load();
    } catch(e) { setErr(e.message); setPrev(false); } finally { setBusy(false); }
  };

  const submitSelf = async () => {
    setBusy(true);
    try { await api.payments.selfReport(selfForm); setSelf(false); load(); setOk('Payment record submitted!'); }
    catch(e) { setErr(e.message); } finally { setBusy(false); }
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

  if (view==='payments') return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <div className="relative z-10 flex items-center justify-between">
          <div><h2 className="font-serif text-xl font-bold text-white">Payment Records</h2>
            <p className="text-white/50 text-sm">Only nationally-approved payments are shown here</p></div>
          <Button icon={CreditCard} onClick={()=>setSelf(true)} size="sm">Report Receipt</Button>
        </div>
      </div>
      {payments.length===0?(
        <Card>
          <div className="text-center py-10">
            <Clock className="w-10 h-10 text-stone-200 mx-auto mb-3"/>
            <p className="font-semibold text-stone-500">No approved payments yet</p>
            <p className="text-sm text-stone-400 mt-1">Payments appear here after District Finance → Regional → National approval chain is complete.</p>
          </div>
        </Card>
      ):(
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-left px-4 py-3">Period</th><th className="text-right px-4 py-3">Days Covered</th><th className="text-right px-4 py-3">Days Paid</th><th className="text-right px-4 py-3">Arrears Days</th><th className="text-right px-4 py-3">Amount Paid</th><th className="text-right px-4 py-3">Arrears (GHS)</th><th className="text-center px-4 py-3">Status</th><th className="text-center px-4 py-3">Approvals</th></tr>
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
                      <div className="flex items-center justify-center gap-1">
                        <span title="District Finance" className={p.district_finance_approved?'text-emerald':'text-stone-300'}>D</span>
                        <span className="text-stone-200">→</span>
                        <span title="Regional Finance" className={p.regional_finance_approved?'text-emerald':'text-stone-300'}>R</span>
                        <span className="text-stone-200">→</span>
                        <span title="National Finance" className={p.national_finance_approved?'text-emerald':'text-stone-300'}>N</span>
                      </div>
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

  if (view==='history') return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#2d4a22 0%,#1e3317 100%)'}}>
        <h2 className="font-serif text-xl font-bold text-white">My Report History</h2>
        <p className="text-white/50 text-sm">{reports.length} total · {compRate}% compliance</p>
      </div>
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Food</th><th className="text-right px-4 py-3">Pupils Fed</th><th className="text-center px-4 py-3">Status</th><th className="text-left px-4 py-3">Comment</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {reports.map(r=>(
                <tr key={r._id||r.id} className={r.status==='rejected'?'bg-rust/5':''}>
                  <td className="px-4 py-2.5 text-xs text-stone-500">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5 text-xs text-ink max-w-[160px] truncate">{r.food_type}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-xs">{fmtNum(r.students_fed)}</td>
                  <td className="px-4 py-2.5 text-center"><Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill></td>
                  <td className="px-4 py-2.5 text-xs text-stone-400 italic">{r.headmaster_comment||'—'}</td>
                </tr>
              ))}
              {reports.length===0&&<tr><td colSpan={5} className="px-4 py-8 text-center text-stone-300 text-sm">No reports yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* Status banners */}
      {todayReport?.status==='approved'&&(
        <div className="p-4 bg-emerald/10 border-2 border-emerald/30 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald"/><div><p className="font-semibold text-emerald">Today's report approved ✓</p><p className="text-sm text-stone-500">{fmtNum(todayReport.students_fed)} pupils · {todayReport.food_type}</p></div>
        </div>
      )}
      {todayReport?.status==='pending'&&(
        <div className="p-4 bg-amber/10 border-2 border-amber/30 rounded-2xl flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber"/><div><p className="font-semibold text-amber">Awaiting headmaster review...</p><p className="text-sm text-stone-500">{fmtNum(todayReport.students_fed)} pupils · {todayReport.food_type}</p></div>
        </div>
      )}
      {rejectedToday&&(
        <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-1"><XCircle className="w-5 h-5 text-rust"/><p className="font-bold text-rust">Today's report was rejected</p></div>
          <p className="text-sm text-stone-600">"{rejectedToday.headmaster_comment}"</p>
          <p className="text-xs text-rust font-medium mt-1">→ Resubmit a corrected report below</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Reports"      value={fmtNum(reports.length)}     icon={ClipboardList} tone="navy"/>
        <KPI label="Approved"     value={fmtNum(approved.length)}    icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Total Meals"  value={fmtNum(totalMeals)}         icon={TrendingUp}    tone="forest"/>
        <KPI label="Amount Paid"  value={cedis(totalPaid)}            icon={DollarSign}    tone="amber"/>
        <KPI label="Arrears"      value={cedis(totalArrears)}         icon={CreditCard}    tone={totalArrears>0?'rust':'emerald'}/>
      </div>

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

      {/* Submit form */}
      {(!todayReport||rejectedToday)&&(
        <Card>
          <h3 className="font-semibold text-ink mb-5 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-forest"/>
            {rejectedToday?'Resubmit Today\'s Report':'Submit Daily Feeding Report'}
          </h3>
          {err&&<div className="mb-4 p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
          <form onSubmit={handlePreview} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Date" type="date" value={form.date} onChange={e=>s('date',e.target.value)} required max={today()}/>
              <Input label="Pupils fed today *" type="number" value={form.studentsFed} onChange={e=>s('studentsFed',e.target.value)} required placeholder={`Max: ${fmtNum(school?.enrolled||0)}`} min="1"/>
            </div>
            <Select label="Food type served today *" value={form.foodType} onChange={e=>s('foodType',e.target.value)} required
              options={[{value:'',label:'Select food type...',disabled:true},...FOODS.map(f=>({value:f,label:f}))]}/>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Time food was ready" type="time" value={form.timeReady} onChange={e=>s('timeReady',e.target.value)}/>
              <Input label="Time food was served" type="time" value={form.timeServed} onChange={e=>s('timeServed',e.target.value)}/>
            </div>
            <Textarea label="Notes (optional)" value={form.notes} onChange={e=>s('notes',e.target.value)} rows={2} placeholder="Any observations..."/>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">Photo evidence (optional)</label>
              <label htmlFor="photo-cat" className="flex items-center gap-3 p-3 border-2 border-dashed border-stone-200 rounded-xl hover:border-forest/40 cursor-pointer">
                <Camera className="w-5 h-5 text-stone-400"/>
                {photo?<span className="text-sm text-emerald">✓ {photo.name}</span>:<span className="text-sm text-stone-400">Click to upload photo</span>}
              </label>
              <input id="photo-cat" type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} className="hidden"/>
            </div>
            <Button type="submit" disabled={!form.foodType||!form.studentsFed} className="w-full" icon={Eye} size="lg">
              Preview Before Submitting →
            </Button>
          </form>
        </Card>
      )}

      {/* Recent reports */}
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
                <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── PREVIEW CONFIRMATION MODAL ── */}
      <Modal open={preview} onClose={()=>setPrev(false)} title="Confirm Your Report" size="md">
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

          {school?.enrolled && Number(form.studentsFed) > school.enrolled * 0.95 && (
            <div className="p-3 bg-amber/10 border border-amber/20 rounded-xl text-xs text-amber font-medium">
              ⚠ You are reporting <strong>{fmtNum(Number(form.studentsFed))}</strong> pupils — close to the maximum enrollment of {fmtNum(school.enrolled)}. Make sure this is accurate.
            </div>
          )}

          <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500">
            By confirming, you certify that this information is accurate and truthful. False reports are subject to disciplinary action.
          </div>

          {err&&<div className="text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={()=>setPrev(false)} disabled={busy}>← Edit Report</Button>
            <Button onClick={handleConfirmedSubmit} disabled={busy} icon={CheckCircle2}>
              {busy?'Submitting...':'Confirm & Submit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
