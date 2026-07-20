import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, CheckCircle2, CalendarDays, Trash2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import { fmtNum, fmtDate } from '../../utils/format';

const BASE  = import.meta.env.VITE_BACKEND_URL || '';
const authH = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` });
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const FOODS = ['Jollof Rice with Chicken','Banku with Okro Stew','Waakye with Fish and Egg','Kenkey with Fried Fish','Yam with Palaver Sauce','Rice and Stew with Egg','Beans Stew with Gari','Tuo Zaafi with Ayoyo Soup','Plantain with Beans','Fufu with Light Soup','Kontomire Stew with Rice','Ampesi with Kontomire','Fried Rice with Chicken','Groundnut Soup with Fufu'];

export default function DistrictCoordinatorPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState('schools');

  // ── School requests state ──
  const [schReqs,  setSchReqs] = useState([]);
  const [modal,    setModal]   = useState(false);
  const [form,     setForm]    = useState({ name:'', town:'', enrolled:'', reason:'' });
  // ── Timetable state ──
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [menu,  setMenu]  = useState([]);
  // ── Shared ──
  const [busy, setBusy] = useState(false);
  const [ok,   setOk]   = useState(null);
  const [err,  setErr]  = useState(null);

  const loadSchools = useCallback(async()=>{
    try {
      const res  = await fetch(`${BASE}/api/school-requests`, { headers:authH() });
      const data = await res.json();
      setSchReqs(data.requests||[]);
    } catch {}
  },[]);

  const loadTimetable = useCallback(()=>{
    fetch(`${BASE}/api/timetable?month=${month}`, { headers:authH() })
      .then(r=>r.ok?r.json():{timetable:null})
      .then(d=>setMenu(d.timetable?.menu||[]))
      .catch(()=>setMenu([]));
  },[month]);

  useEffect(()=>{ loadSchools(); },[loadSchools]);
  useEffect(()=>{ loadTimetable(); },[loadTimetable]);

  // ── School request actions ──
  const doSubmit = async () => {
    if (!form.name.trim()) { setErr('School name is required'); return; }
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/school-requests`, { method:'POST', headers:authH(),
        body:JSON.stringify({ ...form, enrolled:Number(form.enrolled)||0 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Failed');
      setOk(`School request for "${form.name}" submitted! Awaiting DCE approval.`);
      setModal(false); setForm({ name:'', town:'', enrolled:'', reason:'' }); loadSchools();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  // ── Timetable actions ──
  const addRow = () => setMenu(m=>[...m,{ day:'Monday', week:0, food:'', notes:'' }]);
  const setRow = (i,k,v) => setMenu(m=>m.map((r,j)=>j===i?{...r,[k]:v}:r));
  const delRow = (i) => setMenu(m=>m.filter((_,j)=>j!==i));

  const saveTimetable = async () => {
    const valid = menu.filter(m=>m.food.trim());
    if (valid.length===0) { setErr('Add at least one menu item'); return; }
    setBusy(true); setErr(null); setOk(null);
    try {
      const res = await fetch(`${BASE}/api/timetable`, { method:'POST', headers:authH(),
        body:JSON.stringify({ month, menu:valid }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error||'Failed');
      setOk(`Timetable for ${month} published! All caterers in your district can now see it.`);
      loadTimetable();
    } catch(e){ setErr(e.message); } finally { setBusy(false); }
  };

  const pending  = schReqs.filter(r=>r.status==='pending');
  const approved = schReqs.filter(r=>r.status==='approved');
  const rejected = schReqs.filter(r=>r.status==='rejected');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#15493B 0%,#0f3329 100%)'}}>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold text-white">District Coordinator Panel</h1>
            <p className="text-white/50 text-sm">{user.name} · School requests & monthly food timetable</p>
          </div>
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm">{err}</div>}

      {/* Tabs */}
      <div className="flex gap-2">
        {[['schools',`🏫 School Requests (${pending.length} pending)`],['timetable','🍲 Food Timetable']].map(([t,l])=>(
          <button key={t} onClick={()=>{ setTab(t); setErr(null); setOk(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#15493B] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {/* ══ SCHOOL REQUESTS TAB ══ */}
      {tab==='schools'&&(
        <>
          <div className="flex justify-end">
            <Button icon={Plus} onClick={()=>{ setModal(true); setErr(null); }}>Request New School</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-amber">{fmtNum(pending.length)}</div><div className="text-xs text-stone-400">Pending DCE Approval</div></Card>
            <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-emerald">{fmtNum(approved.length)}</div><div className="text-xs text-stone-400">Approved</div></Card>
            <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-rust">{fmtNum(rejected.length)}</div><div className="text-xs text-stone-400">Rejected</div></Card>
          </div>
          <Card noPadding>
            <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">School Requests</h3></div>
            {schReqs.length===0?<p className="p-8 text-center text-stone-300 text-sm">No school requests yet — click "Request New School"</p>:(
              <div className="divide-y divide-stone-50">
                {schReqs.map(r=>(
                  <div key={r._id||r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-ink">{r.name}</div>
                      <div className="text-sm text-stone-500">{r.town||'—'} · {fmtNum(r.enrolled)} pupils</div>
                      <div className="text-xs text-stone-400 mt-0.5">Submitted: {fmtDate(r.created_at)}</div>
                      {r.dce_comment&&<div className="text-xs italic text-stone-500 mt-1">DCE: "{r.dce_comment}"</div>}
                      {r.status==='approved'&&<div className="text-xs text-emerald font-medium mt-1">✓ School created in the system</div>}
                    </div>
                    <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══ FOOD TIMETABLE TAB ══ */}
      {tab==='timetable'&&(
        <Card>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <label className="text-xs font-medium text-stone-500 block mb-1">Month</label>
              <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm"/>
            </div>
            <div className="flex gap-2">
              <Button icon={Plus} variant="secondary" size="sm" onClick={addRow}>Add Item</Button>
              <Button icon={Save} size="sm" onClick={saveTimetable} disabled={busy}>{busy?'Publishing...':'Publish Timetable'}</Button>
            </div>
          </div>
          <div className="p-3 bg-amber/10 border border-amber/20 rounded-xl text-xs text-amber font-medium mb-4">
            ⓘ Once published, every caterer in your district sees this menu and must serve what is scheduled.
          </div>
          {menu.length===0 ? (
            <p className="text-center text-stone-300 text-sm py-8">No menu items yet — click "Add Item" to build the timetable</p>
          ) : (
            <div className="space-y-2">
              {menu.map((m,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-stone-50 rounded-xl">
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-[10px] text-stone-400 block mb-1">Day</label>
                    <select value={m.day} onChange={e=>setRow(i,'day',e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                      {DAYS.map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="text-[10px] text-stone-400 block mb-1">Week</label>
                    <select value={m.week} onChange={e=>setRow(i,'week',Number(e.target.value))}
                      className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                      {[0,1,2,3,4,5].map(w=><option key={w} value={w}>{w===0?'Every week':`Week ${w}`}</option>)}
                    </select>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <label className="text-[10px] text-stone-400 block mb-1">Food</label>
                    <input list="dfc-foods" value={m.food} onChange={e=>setRow(i,'food',e.target.value)}
                      placeholder="Select or type food..."
                      className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white"/>
                  </div>
                  <div className="col-span-10 sm:col-span-3">
                    <label className="text-[10px] text-stone-400 block mb-1">Notes</label>
                    <input value={m.notes||''} onChange={e=>setRow(i,'notes',e.target.value)}
                      placeholder="Optional..."
                      className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white"/>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button onClick={()=>delRow(i)} className="text-stone-300 hover:text-rust p-1.5"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
              <datalist id="dfc-foods">{FOODS.map(f=><option key={f} value={f}/>)}</datalist>
            </div>
          )}
        </Card>
      )}

      {/* New School Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Request New School" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        <div className="space-y-4">
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-xs text-amber font-medium">
            ⓘ Only District Coordinators can request new schools. The DCE must approve before the school is created.
          </div>
          <Input label="School name *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Akontombra D/A Basic School"/>
          <Input label="Town / Location" value={form.town} onChange={e=>setForm(f=>({...f,town:e.target.value}))}/>
          <Input label="Estimated enrollment" type="number" value={form.enrolled} onChange={e=>setForm(f=>({...f,enrolled:e.target.value}))}/>
          <Textarea label="Reason for addition *" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} rows={2}/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setModal(false)} disabled={busy}>Cancel</Button>
            <Button onClick={doSubmit} disabled={busy||!form.name||!form.reason} icon={Plus}>
              {busy?'Submitting...':'Submit for DCE Approval'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
