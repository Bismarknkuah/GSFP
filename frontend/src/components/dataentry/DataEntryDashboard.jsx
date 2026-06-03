import { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, BookOpen, Search, Download, Eye, Plus, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Pill from '../ui/Pill';
import { fmtDate, fmtNum, today, ROLE_LABELS } from '../../utils/format';

const FOODS=['Jollof Rice with Chicken','Banku with Okro Stew','Waakye with Fish and Egg','Kenkey with Fried Fish','Yam with Palaver Sauce','Rice and Stew with Egg','Beans Stew with Gari','Tuo Zaafi with Ayoyo Soup','Plantain with Beans','Fufu with Light Soup','Kontomire Stew with Rice','Ampesi with Kontomire','Fried Rice with Chicken','Groundnut Soup with Fufu','Ayoyo Soup with Tuo Zaafi'];

export default function DataEntryDashboard() {
  const { user }  = useAuth();
  const [reports,  setRep]  = useState([]);
  const [schools,  setSch]  = useState([]);
  const [tab,      setTab]  = useState('submit');
  const [form,     setForm] = useState({ schoolId:'', foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() });
  const [photo,    setPhoto]= useState(null);
  const [search,   setSrch] = useState('');
  const [err,      setErr]  = useState(null);
  const [ok,       setOk]   = useState(null);
  const [busy,     setBusy] = useState(false);
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => {
    Promise.allSettled([api.reports.list({limit:100}), api.schools.list()])
      .then(([r,sch])=>{
        if(r.status==='fulfilled')   setRep(r.value?.reports||[]);
        if(sch.status==='fulfilled') setSch(sch.value?.schools||[]);
      }).catch(console.error);
  };
  useEffect(()=>{ load(); },[]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.schoolId||!form.foodType||!form.studentsFed) { setErr('School, food type and pupils fed are required'); return; }
    setBusy(true); setErr(null);
    try {
      await api.reports.create({ schoolId:form.schoolId, foodType:form.foodType, studentsFed:form.studentsFed, timeReady:form.timeReady, timeServed:form.timeServed, notes:form.notes, date:form.date }, photo);
      setOk('Report submitted successfully! The headmaster will review it.'); setForm({ schoolId:'', foodType:'', studentsFed:'', timeReady:'', timeServed:'', notes:'', date:today() }); setPhoto(null); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const todayReps   = reports.filter(r=>r.date===today());
  const approved    = reports.filter(r=>r.status==='approved').length;
  const pending     = reports.filter(r=>r.status==='pending').length;
  const rejected    = reports.filter(r=>r.status==='rejected').length;
  const visibleReps = reports.filter(r=> !search || (r.school?.name||'').toLowerCase().includes(search.toLowerCase()) || (r.food_type||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#1a3a5f 0%,#0f2d5e 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><ClipboardList className="w-4 h-4 text-blue-300"/><span className="text-xs font-bold tracking-widest text-blue-300/70 uppercase">Data Entry Officer</span></div>
            <h1 className="font-serif text-xl font-bold text-white">{user.name}</h1>
            <p className="text-white/50 text-sm">{ROLE_LABELS[user.role]}</p>
          </div>
          <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Today's Reports" value={fmtNum(todayReps.length)} icon={ClipboardList} tone="navy"/>
        <KPI label="Approved"        value={fmtNum(approved)}          icon={CheckCircle2}  tone="emerald"/>
        <KPI label="Pending Review"  value={fmtNum(pending)}           icon={Clock}         tone="amber"/>
        <KPI label="Rejected"        value={fmtNum(rejected)}          icon={AlertCircle}   tone={rejected>0?'rust':'emerald'}/>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[['submit','Submit Report'],['history','Report History']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#0f2d5e] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* SUBMIT */}
      {tab==='submit'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-5 flex items-center gap-2"><Plus className="w-4 h-4 text-navy"/>Submit Feeding Report</h3>
          {err&&<div className="mb-4 p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{err}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="School *" value={form.schoolId} onChange={e=>s('schoolId',e.target.value)} required
                options={[{value:'',label:'Select school...',disabled:true},...schools.map(sch=>({value:sch._id||sch.id,label:`${sch.name} (${fmtNum(sch.enrolled)} pupils)`}))]}/>
              <Input label="Date *" type="date" value={form.date} onChange={e=>s('date',e.target.value)} required max={today()}/>
            </div>
            <Select label="Food type served today *" value={form.foodType} onChange={e=>s('foodType',e.target.value)} required
              options={[{value:'',label:'Select food type...',disabled:true},...FOODS.map(f=>({value:f,label:f}))]}/>
            <Input label="Number of pupils fed *" type="number" value={form.studentsFed} onChange={e=>s('studentsFed',e.target.value)} required placeholder="e.g. 312" min="1"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Time food was ready" type="time" value={form.timeReady} onChange={e=>s('timeReady',e.target.value)}/>
              <Input label="Time food was served" type="time" value={form.timeServed} onChange={e=>s('timeServed',e.target.value)}/>
            </div>
            <Textarea label="Notes (optional)" value={form.notes} onChange={e=>s('notes',e.target.value)} rows={3} placeholder="Any challenges, special notes or observations..."/>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1.5 block">Photo evidence (optional)</label>
              <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center hover:border-navy/40 transition-colors">
                <input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files[0])} className="hidden" id="photo-upload"/>
                <label htmlFor="photo-upload" className="cursor-pointer">
                  {photo ? (
                    <div className="text-sm text-emerald font-medium">✓ {photo.name}</div>
                  ) : (
                    <div className="text-stone-400 text-sm">Click to upload photo<br/><span className="text-xs">JPG, PNG up to 5MB</span></div>
                  )}
                </label>
              </div>
            </div>
            <div className="bg-navy/5 border border-navy/15 rounded-xl p-3 text-xs text-stone-500">
              <strong className="text-navy">Note:</strong> After submission, the headmaster will review and approve or reject this report. You will be notified of the outcome.
            </div>
            <Button type="submit" disabled={busy||!form.schoolId||!form.foodType||!form.studentsFed} className="w-full" icon={ClipboardList}>
              {busy?'Submitting report...':'Submit Feeding Report'}
            </Button>
          </form>
        </Card>
      )}

      {/* HISTORY */}
      {tab==='history'&&(
        <>
          <div className="flex gap-3">
            <Input icon={Search} placeholder="Search school or food..." value={search} onChange={e=>setSrch(e.target.value)} className="flex-1"/>
          </div>
          <Card noPadding>
            {visibleReps.length===0
              ? <div className="p-8 text-center text-stone-300 text-sm">No reports found</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">School</th>
                        <th className="text-left px-4 py-3">Food Served</th>
                        <th className="text-right px-4 py-3">Pupils Fed</th>
                        <th className="text-center px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Reviewer Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {visibleReps.map(r=>(
                        <tr key={r._id||r.id} className={`hover:bg-paper ${r.status==='rejected'?'bg-rust/5':''}`}>
                          <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink text-xs">{r.school?.name||'—'}</div>
                            <div className="text-[10px] text-stone-400">{r.school?.town}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-600 max-w-[180px] truncate">{r.food_type}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{fmtNum(r.students_fed)}</td>
                          <td className="px-4 py-3 text-center"><Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill></td>
                          <td className="px-4 py-3 text-xs text-stone-500 italic max-w-[200px] truncate">{r.headmaster_comment||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </Card>
        </>
      )}
    </div>
  );
}
