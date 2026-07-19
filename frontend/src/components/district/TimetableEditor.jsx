import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const BASE = import.meta.env.VITE_BACKEND_URL || '';
const authH = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` });
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const FOODS = ['Jollof Rice with Chicken','Banku with Okro Stew','Waakye with Fish and Egg','Kenkey with Fried Fish','Yam with Palaver Sauce','Rice and Stew with Egg','Beans Stew with Gari','Tuo Zaafi with Ayoyo Soup','Plantain with Beans','Fufu with Light Soup','Kontomire Stew with Rice','Ampesi with Kontomire','Fried Rice with Chicken','Groundnut Soup with Fufu'];

export default function TimetableEditor() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [menu,  setMenu]  = useState([]);
  const [busy,  setBusy]  = useState(false);
  const [ok,    setOk]    = useState(null);
  const [err,   setErr]   = useState(null);

  const load = useCallback(()=>{
    fetch(`${BASE}/api/timetable?month=${month}`, { headers:authH() })
      .then(r=>r.json()).then(d=>setMenu(d.timetable?.menu||[])).catch(()=>{});
  },[month]);
  useEffect(()=>{ load(); },[load]);

  const addRow  = () => setMenu(m=>[...m,{ day:'Monday', week:0, food:'', notes:'' }]);
  const setRow  = (i,k,v) => setMenu(m=>m.map((r,j)=>j===i?{...r,[k]:v}:r));
  const delRow  = (i) => setMenu(m=>m.filter((_,j)=>j!==i));

  const save = async () => {
    const valid = menu.filter(m=>m.food.trim());
    if (valid.length===0) { setErr('Add at least one menu item'); return; }
    setBusy(true); setErr(null); setOk(null);
    try {
      const res = await fetch(`${BASE}/api/timetable`, { method:'POST', headers:authH(),
        body:JSON.stringify({ month, menu:valid }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error||'Failed');
      setOk(`Timetable for ${month} published! All caterers in your district can now see it.`);
      load();
    } catch(e){ setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#15493B,#0f3329)'}}>
        <h1 className="font-serif text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-300"/>Monthly Food Timetable
        </h1>
        <p className="text-white/50 text-sm">Post the official menu — caterers in your district must follow it</p>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm">{err}</div>}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-xs font-medium text-stone-500 block mb-1">Month</label>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm"/>
          </div>
          <div className="flex gap-2">
            <Button icon={Plus} variant="secondary" size="sm" onClick={addRow}>Add Item</Button>
            <Button icon={Save} size="sm" onClick={save} disabled={busy}>{busy?'Publishing...':'Publish Timetable'}</Button>
          </div>
        </div>

        {menu.length===0 ? (
          <p className="text-center text-stone-300 text-sm py-8">No menu items yet — click "Add Item" to build the timetable</p>
        ) : (
          <div className="space-y-2">
            {menu.map((m,i)=>(
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-stone-50 rounded-xl">
                <div className="col-span-2">
                  <label className="text-[10px] text-stone-400 block mb-1">Day</label>
                  <select value={m.day} onChange={e=>setRow(i,'day',e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                    {DAYS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-stone-400 block mb-1">Week (0=all)</label>
                  <select value={m.week} onChange={e=>setRow(i,'week',Number(e.target.value))}
                    className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                    {[0,1,2,3,4,5].map(w=><option key={w} value={w}>{w===0?'Every week':`Week ${w}`}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <label className="text-[10px] text-stone-400 block mb-1">Food</label>
                  <input list="foods" value={m.food} onChange={e=>setRow(i,'food',e.target.value)}
                    placeholder="Select or type food..."
                    className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white"/>
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-stone-400 block mb-1">Notes</label>
                  <input value={m.notes||''} onChange={e=>setRow(i,'notes',e.target.value)}
                    placeholder="Optional..."
                    className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs bg-white"/>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={()=>delRow(i)} className="text-stone-300 hover:text-rust p-1.5"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
            <datalist id="foods">{FOODS.map(f=><option key={f} value={f}/>)}</datalist>
          </div>
        )}
      </Card>
    </div>
  );
}
