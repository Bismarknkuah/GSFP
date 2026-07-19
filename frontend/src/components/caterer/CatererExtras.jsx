import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Wallet, Plus, Trash2, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Lock, Lightbulb } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import { fmtNum, fmtDate, cedis } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';
const authH = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` });
const CATS = [
  { value:'ingredients', label:'🥕 Ingredients' },
  { value:'fuel',        label:'🔥 Fuel / Gas / Charcoal' },
  { value:'transport',   label:'🚚 Transport' },
  { value:'labour',      label:'👥 Labour / Helpers' },
  { value:'equipment',   label:'🍳 Equipment / Utensils' },
  { value:'other',       label:'📦 Other' },
];

/* ── FOOD TIMETABLE (read-only for caterer) ─────────────── */
export function FoodTimetableView() {
  const [tt, setTt]       = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));

  useEffect(()=>{
    fetch(`${BASE}/api/timetable?month=${month}`, { headers:authH() })
      .then(r=>r.json()).then(d=>setTt(d.timetable)).catch(()=>{});
  },[month]);

  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-forest"/>Monthly Food Timetable
        </h3>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2 py-1.5"/>
      </div>
      {!tt ? (
        <p className="text-sm text-stone-300 text-center py-8">
          No timetable posted for this month yet.<br/>
          <span className="text-xs">Your District Feeding Coordinator will post the official menu.</span>
        </p>
      ) : (
        <div className="space-y-2">
          {days.map(day=>{
            const items = (tt.menu||[]).filter(m=>m.day===day);
            return (
              <div key={day} className="flex items-start gap-3 p-3 bg-forest/5 border border-forest/15 rounded-xl">
                <div className="w-24 flex-shrink-0 text-xs font-bold text-forest uppercase tracking-wide pt-0.5">{day}</div>
                <div className="flex-1">
                  {items.length===0
                    ? <span className="text-xs text-stone-300">—</span>
                    : items.map((m,i)=>(
                      <div key={i} className="text-sm text-ink">
                        {m.week>0 && <span className="text-[10px] font-bold text-amber mr-1">W{m.week}</span>}
                        {m.food}
                        {m.notes && <span className="text-xs text-stone-400 italic ml-1">({m.notes})</span>}
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-stone-400 text-right">Posted by {tt.posted_by_name} · Serve exactly what is scheduled, or note the reason when different.</p>
        </div>
      )}
    </Card>
  );
}

/* ── EXPENDITURE OFFICE (private to this caterer) ────────── */
export function ExpenditureOffice() {
  const { user } = useAuth();
  const [exps,     setExps]   = useState([]);
  const [guide,    setGuide]  = useState(null);
  const [month,    setMonth]  = useState(new Date().toISOString().slice(0,7));
  const [modal,    setModal]  = useState(false);
  const [form,     setForm]   = useState({ date:new Date().toISOString().slice(0,10), category:'ingredients', item:'', amount:'', notes:'' });
  const [busy,     setBusy]   = useState(false);
  const [err,      setErr]    = useState(null);

  const load = useCallback(()=>{
    fetch(`${BASE}/api/expenditure?month=${month}`, { headers:authH() })
      .then(r=>r.json()).then(d=>setExps(d.expenditures||[])).catch(()=>{});
    fetch(`${BASE}/api/expenditure/guidance?month=${month}`, { headers:authH() })
      .then(r=>r.json()).then(setGuide).catch(()=>{});
  },[month]);
  useEffect(()=>{ load(); },[load]);

  const add = async () => {
    if (!form.item || !form.amount) { setErr('Item and amount are required'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`${BASE}/api/expenditure`, { method:'POST', headers:authH(), body:JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error||'Failed');
      setModal(false); setForm({ date:new Date().toISOString().slice(0,10), category:'ingredients', item:'', amount:'', notes:'' });
      load();
    } catch(e){ setErr(e.message); } finally { setBusy(false); }
  };

  const del = async (id) => {
    await fetch(`${BASE}/api/expenditure/${id}`, { method:'DELETE', headers:authH() });
    load();
  };

  const statusTone = guide?.status==='over_budget'?'rust':guide?.status==='warning'?'amber':'emerald';

  return (
    <div className="space-y-4">
      {/* Privacy banner */}
      <div className="p-3 bg-navy/5 border border-navy/15 rounded-xl flex items-center gap-2 text-xs text-navy font-medium">
        <Lock className="w-3.5 h-3.5 flex-shrink-0"/>
        Private Office — only you ({user.name}) can see this. No officer or other caterer has access to your expenditure records.
      </div>

      {/* Budget guidance */}
      {guide && (
        <Card className={`border-2 ${statusTone==='rust'?'border-rust/30 bg-rust/5':statusTone==='amber'?'border-amber/30 bg-amber/5':'border-emerald/30 bg-emerald/5'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ink flex items-center gap-2">
              {statusTone==='rust'?<AlertTriangle className="w-4 h-4 text-rust"/>:statusTone==='amber'?<TrendingDown className="w-4 h-4 text-amber"/>:<CheckCircle2 className="w-4 h-4 text-emerald"/>}
              Budget Health — {month}
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
            <div className={`h-full rounded-full transition-all ${statusTone==='rust'?'bg-rust':statusTone==='amber'?'bg-amber':'bg-emerald'}`}
              style={{width:`${Math.min(100,guide.spend_ratio)}%`}}/>
          </div>
          {guide.tips?.length>0 && (
            <div className="space-y-1.5">
              {guide.tips.map((t,i)=>(
                <div key={i} className="flex items-start gap-2 text-xs text-stone-600">
                  <Lightbulb className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5"/>{t}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Records */}
      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink flex items-center gap-2"><Wallet className="w-4 h-4 text-forest"/>Expenditure Records</h3>
          <div className="flex items-center gap-2">
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2 py-1.5"/>
            <Button icon={Plus} size="sm" onClick={()=>{ setModal(true); setErr(null); }}>Add</Button>
          </div>
        </div>
        {exps.length===0 ? <p className="p-8 text-center text-stone-300 text-sm">No expenditures recorded for {month}</p> : (
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
                      <button onClick={()=>del(e._id)} className="text-stone-300 hover:text-rust"><Trash2 className="w-3.5 h-3.5"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Record Expenditure" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        <div className="space-y-3">
          <Input label="Date *" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
          <Select label="Category *" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} options={CATS}/>
          <Input label="Item / description *" value={form.item} onChange={e=>setForm(f=>({...f,item:e.target.value}))} placeholder="e.g. 2 bags of rice"/>
          <Input label="Amount (GHS) *" type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
          <Input label="Notes (optional)" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setModal(false)} disabled={busy}>Cancel</Button>
            <Button onClick={add} disabled={busy||!form.item||!form.amount}>{busy?'Saving...':'Save Record'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
