import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Pill from '../ui/Pill';
import { fmtNum, fmtDate } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

export default function DistrictCoordinatorPanel() {
  const { user }    = useAuth();
  const [schReqs,  setSchReqs] = useState([]);
  const [modal,    setModal]   = useState(false);
  const [form,     setForm]    = useState({ name:'', town:'', enrolled:'', reason:'' });
  const [busy,     setBusy]    = useState(false);
  const [ok,       setOk]      = useState(null);
  const [err,      setErr]     = useState(null);

  const authH = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` };

  const load = useCallback(async()=>{
    const res  = await fetch(`${BASE}/api/school-requests`, { headers:authH });
    const data = await res.json();
    setSchReqs(data.requests||[]);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const doSubmit = async () => {
    if (!form.name.trim()) { setErr('School name is required'); return; }
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/school-requests`, { method:'POST', headers:authH, body:JSON.stringify({ ...form, enrolled:Number(form.enrolled)||0 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Failed');
      setOk(`School request for "${form.name}" submitted! Awaiting DCE approval.`);
      setModal(false); setForm({ name:'', town:'', enrolled:'', reason:'' }); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const pending  = schReqs.filter(r=>r.status==='pending');
  const approved = schReqs.filter(r=>r.status==='approved');
  const rejected = schReqs.filter(r=>r.status==='rejected');

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#15493B 0%,#0f3329 100%)'}}>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold text-white">School Management</h1>
            <p className="text-white/50 text-sm">Submit new school requests for DCE approval</p>
          </div>
          <Button icon={Plus} onClick={()=>{ setModal(true); setErr(null); }}>Request New School</Button>
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-amber">{fmtNum(pending.length)}</div><div className="text-xs text-stone-400">Pending DCE Approval</div></Card>
        <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-emerald">{fmtNum(approved.length)}</div><div className="text-xs text-stone-400">Approved</div></Card>
        <Card className="text-center py-3"><div className="text-2xl font-bold font-serif text-rust">{fmtNum(rejected.length)}</div><div className="text-xs text-stone-400">Rejected</div></Card>
      </div>

      <Card noPadding>
        <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">School Requests</h3></div>
        {schReqs.length===0?<p className="p-8 text-center text-stone-300 text-sm">No school requests yet — click "Request New School" to submit one</p>:(
          <div className="divide-y divide-stone-50">
            {schReqs.map(r=>(
              <div key={r._id||r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-ink">{r.name}</div>
                  <div className="text-sm text-stone-500">{r.town||'—'} · {fmtNum(r.enrolled)} pupils</div>
                  <div className="text-xs text-stone-400 mt-0.5">Submitted: {fmtDate(r.created_at)}</div>
                  {r.dce_comment&&<div className="text-xs italic text-stone-500 mt-1">DCE: "{r.dce_comment}"</div>}
                  {r.status==='approved'&&<div className="text-xs text-emerald font-medium mt-1">✓ School has been created in the system</div>}
                </div>
                <Pill tone={r.status==='approved'?'emerald':r.status==='rejected'?'rust':'amber'}>{r.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* New School Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Request New School" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        <div className="space-y-4">
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-xs text-amber font-medium">
            ⓘ Only District Coordinators can request new schools. The DCE must approve before the school is created in the system.
          </div>
          <Input label="School name *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Akontombra D/A Basic School"/>
          <Input label="Town / Location" value={form.town} onChange={e=>setForm(f=>({...f,town:e.target.value}))} placeholder="e.g. Akontombra"/>
          <Input label="Estimated enrollment" type="number" value={form.enrolled} onChange={e=>setForm(f=>({...f,enrolled:e.target.value}))} placeholder="e.g. 300"/>
          <Textarea label="Reason for addition *" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} rows={2}
            placeholder="e.g. New school completed construction, previously unregistered school now meeting standards..."/>
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
