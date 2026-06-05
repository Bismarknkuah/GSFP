import { useState, useEffect, useCallback } from 'react';
import { Settings, Trash2, AlertTriangle, RefreshCw, Shield, CheckCircle2, Database, AlertCircle, Lock, Clock, UserCheck, XCircle, Send, Bell, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { fmtDateTime } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

const RESET_OPTIONS = [
  { id:'reports',          label:'Reports Only',       desc:'Delete all feeding reports. Users, schools, payments are kept.', color:'amber', icon:'📋' },
  { id:'payments',         label:'Payments Only',       desc:'Delete all payment records. Users, schools, reports are kept.', color:'amber', icon:'💰' },
  { id:'reports_payments', label:'Reports & Payments',  desc:'Delete all reports and payments. Users and schools remain.',    color:'rust',  icon:'🗃️' },
  { id:'all',              label:'Full System Reset',   desc:'Delete ALL data — reports, payments, users, schools, regions. System returns to completely empty state.', color:'rust', icon:'⚠️' },
];

const STATUS_CONFIG = {
  pending_ceo:    { label:'Awaiting CEO',               tone:'amber', icon:'⏳' },
  pending_natdir: { label:'Awaiting National Director',  tone:'amber', icon:'⏳' },
  dual_approved:  { label:'Dual Approved — Ready',       tone:'emerald', icon:'✅' },
  rejected:       { label:'Rejected',                    tone:'rust',   icon:'❌' },
  executed:       { label:'Executed',                    tone:'stone',  icon:'🔒' },
};

function ApprovalTimeline({ request }) {
  const steps = [
    { label:'Requested by Super Admin', done:true, name:request.requested_by_name, at:request.created_at, icon:'🔐' },
    { label:'CEO Approval', done:request.ceo_approved, rejected:request.status==='rejected'&&!request.ceo_approved, name:request.ceo_name, at:request.ceo_decided_at, icon:'👑', comment:request.ceo_comment },
    { label:'National Director Approval', done:request.natdir_approved, rejected:request.status==='rejected'&&request.ceo_approved, name:request.natdir_name, at:request.natdir_decided_at, icon:'🏛️', comment:request.natdir_comment },
    { label:'Executed by Super Admin', done:request.status==='executed', name:null, at:request.executed_at, icon:'💥' },
  ];
  return (
    <div className="space-y-0">
      {steps.map((s,i)=>(
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 ${s.done?'border-emerald bg-emerald/10':s.rejected?'border-rust bg-rust/10':'border-stone-200 bg-stone-50'}`}>
              {s.rejected?'❌':s.done?'✓':s.icon}
            </div>
            {i<steps.length-1&&<div className={`w-0.5 h-6 ${s.done?'bg-emerald':'bg-stone-200'}`}/>}
          </div>
          <div className="pb-4 pt-1 min-w-0">
            <div className={`text-sm font-semibold ${s.done?'text-ink':s.rejected?'text-rust':'text-stone-400'}`}>{s.label}</div>
            {s.name&&<div className="text-xs text-stone-400">{s.name} · {fmtDateTime(s.at)}</div>}
            {s.comment&&<div className="text-xs italic text-stone-500 mt-0.5">"{s.comment}"</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SystemConfig() {
  const { user } = useAuth();
  const [requests,     setRequests]    = useState([]);
  const [initiateModal,setInitModal]   = useState(null);
  const [reason,       setReason]      = useState('');
  const [decideModal,  setDecideModal] = useState(null);
  const [decideComment,setDecComment]  = useState('');
  const [execModal,    setExecModal]   = useState(null);
  const [confirmText,  setConfirmText] = useState('');
  const [reseedModal,  setReseedModal] = useState(false);
  const [busy,         setBusy]        = useState(false);
  const [ok,           setOk]          = useState(null);
  const [err,          setErr]         = useState(null);
  const [detailModal,  setDetailModal] = useState(null);

  const isSuperAdmin = user.role === 'super_admin';
  const isCEO        = user.role === 'ceo';
  const isNatDir     = user.role === 'national_director';
  const canView      = isSuperAdmin || isCEO || isNatDir;

  const auth = { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('gsfp.token')}` };

  const load = useCallback(async()=>{
    if (!canView) return;
    try {
      const r = await fetch(`${BASE}/api/system/reset/requests`, { headers:auth });
      const d = await r.json();
      setRequests(d.requests||[]);
    } catch{}
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,30000); return()=>clearInterval(t); },[load]);

  const pendingForMe = requests.filter(r=>
    (isCEO    && r.status==='pending_ceo') ||
    (isNatDir && r.status==='pending_natdir')
  );
  const dualApproved = requests.find(r=>r.status==='dual_approved');

  const doInitiate = async () => {
    if (!reason.trim()) { setErr('Reason is required'); return; }
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/system/reset/initiate`, { method:'POST', headers:auth, body:JSON.stringify({ scope:initiateModal.id, reason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Failed');
      setOk(`Reset request submitted. Awaiting CEO approval. Request ID: ${data.request._id}`);
      setInitModal(null); setReason(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doDecide = async (action) => {
    if (action==='reject' && !decideComment.trim()) { setErr('Comment required for rejection'); return; }
    setBusy(true); setErr(null);
    try {
      const endpoint = isCEO ? 'ceo' : 'natdir';
      const res  = await fetch(`${BASE}/api/system/reset/${decideModal._id||decideModal.id}/${endpoint}`, { method:'POST', headers:auth, body:JSON.stringify({ action, comment:decideComment }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Failed');
      setOk(`Reset request ${action}ed successfully.`);
      setDecideModal(null); setDecComment(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doExecute = async () => {
    if (confirmText !== 'RESET CONFIRMED') { setErr('Type exactly: RESET CONFIRMED'); return; }
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/system/reset/${execModal._id||execModal.id}/execute`, { method:'POST', headers:auth, body:JSON.stringify({ confirmText }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Failed');
      const summary = data.deleted ? Object.entries(data.deleted).map(([k,v])=>`${v} ${k}`).join(', ') : '';
      setOk(`✓ System reset complete. ${summary}`);
      setExecModal(null); setConfirmText(''); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const doReseed = async () => {
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(`${BASE}/api/system/reseed`, { method:'POST', headers:auth });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Failed');
      setOk(`✓ Demo data loaded: ${data.summary}`);
      setReseedModal(false); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (!canView) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Lock className="w-12 h-12 text-stone-300"/>
      <p className="font-semibold text-stone-500">Access restricted</p>
      <p className="text-sm text-stone-400">Only Super Admin, CEO, and National Director can access System Configuration.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#0d1117 0%,#1F2937 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><Settings className="w-4 h-4 text-amber"/><span className="text-[10px] font-bold tracking-widest text-amber/70 uppercase">System Administration</span></div>
          <h1 className="font-serif text-2xl font-bold text-white">System Configuration</h1>
          <p className="text-white/50 text-sm mt-1">{user.name} · {user.role==='super_admin'?'Super Administrator':user.role==='ceo'?'Chief Executive Officer':'National Coordinating Director'}</p>
        </div>
      </div>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0"/>{err}</div>}

      {/* Pending approvals for CEO/NatDir */}
      {pendingForMe.length>0&&(
        <Card className="border-2 border-amber/30 bg-amber/5">
          <h3 className="font-semibold text-ink mb-3 flex items-center gap-2"><Bell className="w-4 h-4 text-amber"/>{pendingForMe.length} System Reset Request{pendingForMe.length!==1?'s':''} Awaiting Your Approval</h3>
          {pendingForMe.map(r=>(
            <div key={r._id||r.id} className="p-4 bg-white rounded-xl border border-amber/20 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold text-ink">{r.scope_label}</div>
                  <div className="text-sm text-stone-500 mt-0.5">Requested by: <strong>{r.requested_by_name}</strong></div>
                  <div className="text-sm text-stone-600 mt-1 italic">"{r.reason}"</div>
                  <div className="text-xs text-stone-400 mt-1">Submitted: {fmtDateTime(r.created_at)} · Expires: {fmtDateTime(r.expires_at)}</div>
                </div>
                <Button size="sm" onClick={()=>{ setDecideModal(r); setDecComment(''); setErr(null); }}>Review</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Dual-approved — ready to execute (Super Admin only) */}
      {isSuperAdmin && dualApproved&&(
        <Card className="border-2 border-emerald/30 bg-emerald/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-5 h-5 text-emerald"/><h3 className="font-bold text-ink">Reset Approved — Ready to Execute</h3></div>
              <div className="text-sm text-stone-600">{dualApproved.scope_label} · Approved by {dualApproved.ceo_name} (CEO) and {dualApproved.natdir_name} (National Director)</div>
              <div className="text-xs text-stone-400 mt-1">Expires: {fmtDateTime(dualApproved.expires_at)}</div>
            </div>
            <button onClick={()=>{ setExecModal(dualApproved); setConfirmText(''); setErr(null); }}
              className="flex-shrink-0 px-4 py-2 bg-rust text-white rounded-xl font-bold text-sm hover:bg-rust/90">
              Execute Reset
            </button>
          </div>
        </Card>
      )}

      {/* Approval workflow explanation */}
      <Card>
        <h3 className="font-semibold text-ink mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-navy"/>Reset Approval Workflow</h3>
        <div className="grid md:grid-cols-4 gap-3">
          {[
            { step:'1', role:'Super Admin', action:'Initiates reset request with reason', icon:'🔐', color:'bg-stone-100' },
            { step:'2', role:'CEO',         action:'Reviews and approves or rejects',     icon:'👑', color:'bg-amber/10' },
            { step:'3', role:'Nat. Director',action:'Reviews and approves or rejects',   icon:'🏛️', color:'bg-blue-50' },
            { step:'4', role:'Super Admin', action:'Executes after both approvals',       icon:'⚡', color:'bg-rust/5' },
          ].map(s=>(
            <div key={s.step} className={`${s.color} rounded-xl p-3 text-center`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">{s.role}</div>
              <div className="text-xs text-stone-500 mt-1">{s.action}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Super Admin: Reset options */}
      {isSuperAdmin&&(
        <Card>
          <h3 className="font-semibold text-ink mb-1 flex items-center gap-2"><Trash2 className="w-4 h-4 text-rust"/>Request Data Reset</h3>
          <p className="text-xs text-stone-400 mb-4">Initiates the dual-approval workflow. Both CEO and National Director must approve before any data is deleted.</p>
          <div className="grid md:grid-cols-2 gap-3">
            {RESET_OPTIONS.map(opt=>(
              <div key={opt.id} className={`p-4 rounded-xl border-2 ${opt.color==='rust'?'border-rust/20 bg-rust/5':'border-amber/20 bg-amber/5'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="flex items-center gap-2 mb-1"><span className="text-xl">{opt.icon}</span><span className="font-bold text-ink">{opt.label}</span></div>
                    <p className="text-xs text-stone-500">{opt.desc}</p></div>
                  <button onClick={()=>{ setInitModal(opt); setReason(''); setErr(null); }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold ${opt.color==='rust'?'bg-rust text-white hover:bg-rust/90':'bg-amber/90 text-white hover:bg-amber'}`}>
                    Request</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Super Admin: Reseed */}
      {isSuperAdmin&&(
        <Card>
          <h3 className="font-semibold text-ink mb-1 flex items-center gap-2"><Database className="w-4 h-4 text-forest"/>Load Demo Data</h3>
          <p className="text-xs text-stone-400 mb-4">Wipe and reload fresh demo data — 34 users, 8 schools, 30 days of reports, payments, disbursements.</p>
          <div className="flex items-center justify-between p-4 bg-forest/5 border border-forest/20 rounded-xl">
            <div><div className="font-semibold text-ink">Reseed Production Database</div>
              <div className="text-xs text-stone-400">All current data will be replaced with demo data</div></div>
            <Button icon={RefreshCw} onClick={()=>setReseedModal(true)} disabled={busy} variant="secondary">Load Demo Data</Button>
          </div>
        </Card>
      )}

      {/* Request history */}
      {requests.length>0&&(
        <Card noPadding>
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-ink flex items-center gap-2"><Activity className="w-4 h-4 text-forest"/>Reset Request History</h3>
            <Button icon={RefreshCw} variant="ghost" size="sm" onClick={load}>Refresh</Button>
          </div>
          <div className="divide-y divide-stone-50">
            {requests.map(r=>{
              const cfg = STATUS_CONFIG[r.status]||{ label:r.status, tone:'stone', icon:'?' };
              return (
                <div key={r._id||r.id} className="flex items-center justify-between px-5 py-3 hover:bg-paper cursor-pointer" onClick={()=>setDetailModal(r)}>
                  <div>
                    <div className="text-sm font-semibold text-ink">{r.scope_label}</div>
                    <div className="text-xs text-stone-400">{r.requested_by_name} · {fmtDateTime(r.created_at)}</div>
                    <div className="text-xs text-stone-500 italic mt-0.5">"{r.reason?.slice(0,60)}{r.reason?.length>60?'...':''}"</div>
                  </div>
                  <Pill tone={cfg.tone}>{cfg.icon} {cfg.label}</Pill>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Initiate Modal ── */}
      <Modal open={!!initiateModal} onClose={()=>{ setInitModal(null); setErr(null); }} title={`Request: ${initiateModal?.label}`} size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        {initiateModal&&(
          <div className="space-y-4">
            <div className="p-4 bg-amber/10 border-2 border-amber/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber"/><span className="font-bold text-amber">Dual Approval Required</span></div>
              <p className="text-sm text-stone-600">{initiateModal.desc}</p>
              <p className="text-xs text-stone-500 mt-2">This request will be sent to the <strong>CEO</strong> and <strong>National Director</strong> for approval. Data will only be deleted after both approve.</p>
            </div>
            <Textarea label="Reason for reset *" value={reason} onChange={e=>setReason(e.target.value)} rows={3}
              placeholder="Explain why this reset is necessary (e.g. end of academic year, data migration, testing)..."/>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>{ setInitModal(null); setErr(null); }} disabled={busy}>Cancel</Button>
              <Button onClick={doInitiate} disabled={busy||!reason.trim()} icon={Send}>{busy?'Submitting...':'Submit for Approval'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── CEO / NatDir Decision Modal ── */}
      <Modal open={!!decideModal} onClose={()=>{ setDecideModal(null); setErr(null); }} title="Review Reset Request" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        {decideModal&&(
          <div className="space-y-4">
            <div className="p-4 bg-stone-50 rounded-xl space-y-2">
              <div><span className="text-xs text-stone-400">Scope</span><div className="font-bold text-ink text-lg">{decideModal.scope_label}</div></div>
              <div><span className="text-xs text-stone-400">Requested by</span><div className="font-medium text-ink">{decideModal.requested_by_name}</div></div>
              <div><span className="text-xs text-stone-400">Reason</span><div className="text-sm text-stone-600 italic">"{decideModal.reason}"</div></div>
              <div><span className="text-xs text-stone-400">Submitted</span><div className="text-sm">{fmtDateTime(decideModal.created_at)}</div></div>
            </div>
            {isCEO&&decideModal.status==='pending_ceo'&&(
              <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-xs text-amber font-medium">
                After your approval, this request will go to the National Director for final confirmation.
              </div>
            )}
            {isNatDir&&decideModal.status==='pending_natdir'&&(
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 font-medium">
                CEO has already approved this request. Your approval will allow the Super Admin to execute the reset.
                CEO comment: "{decideModal.ceo_comment||'No comment'}"
              </div>
            )}
            <Textarea label="Comment (required for rejection)" value={decideComment}
              onChange={e=>setDecComment(e.target.value)} rows={2} placeholder="Add your comments..."/>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>doDecide('approve')} disabled={busy}
                className="py-3.5 bg-emerald text-white rounded-xl font-bold hover:bg-emerald/90 disabled:opacity-50">
                ✓ Approve Request
              </button>
              <button onClick={()=>doDecide('reject')} disabled={busy}
                className="py-3.5 bg-rust text-white rounded-xl font-bold hover:bg-rust/90 disabled:opacity-50">
                ✗ Reject Request
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Execute Modal ── */}
      <Modal open={!!execModal} onClose={()=>{ setExecModal(null); setConfirmText(''); setErr(null); }} title="Execute System Reset" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        {execModal&&(
          <div className="space-y-4">
            <div className="p-4 bg-emerald/10 border-2 border-emerald/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2"><UserCheck className="w-5 h-5 text-emerald"/><span className="font-bold text-emerald">Both approvals received</span></div>
              <div className="text-sm space-y-1">
                <div>✓ CEO: <strong>{execModal.ceo_name}</strong> — "{execModal.ceo_comment||'Approved'}"</div>
                <div>✓ Nat. Director: <strong>{execModal.natdir_name}</strong> — "{execModal.natdir_comment||'Approved'}"</div>
              </div>
            </div>
            <div className="p-4 bg-rust/10 border-2 border-rust/30 rounded-xl">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-rust"/><span className="font-bold text-rust">This will permanently delete: {execModal.scope_label}</span></div>
              <p className="text-xs text-stone-600">{RESET_OPTIONS.find(o=>o.id===execModal.scope)?.desc}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-2">Type <strong className="font-mono text-rust">RESET CONFIRMED</strong> to execute:</label>
              <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="RESET CONFIRMED"
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:border-rust tracking-wider"/>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>{ setExecModal(null); setConfirmText(''); }} disabled={busy}>Cancel</Button>
              <button onClick={doExecute} disabled={busy||confirmText!=='RESET CONFIRMED'}
                className="px-4 py-2 bg-rust text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-rust/90">
                {busy?'Executing...':'Execute Reset Now'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reseed confirm modal ── */}
      <Modal open={reseedModal} onClose={()=>setReseedModal(false)} title="Confirm: Load Demo Data" size="sm">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2.5">{err}</div>}
        <p className="text-sm text-stone-600 mb-4">This will wipe all current data and replace it with fresh demo data. Are you sure?</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={()=>setReseedModal(false)} disabled={busy}>Cancel</Button>
          <Button onClick={doReseed} disabled={busy} icon={RefreshCw}>{busy?'Loading...':'Yes, Load Demo Data'}</Button>
        </div>
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal open={!!detailModal} onClose={()=>setDetailModal(null)} title="Request Detail" size="md">
        {detailModal&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Scope',detailModal.scope_label],['Reason',detailModal.reason],['Requested by',detailModal.requested_by_name],['Created',fmtDateTime(detailModal.created_at)],['Expires',fmtDateTime(detailModal.expires_at)],['Status',STATUS_CONFIG[detailModal.status]?.label||detailModal.status]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v||'—'}</div></div>
              ))}
            </div>
            <ApprovalTimeline request={detailModal}/>
            {detailModal.reject_reason&&<div className="bg-rust/10 rounded-xl p-3 text-sm"><div className="text-xs text-stone-400">Rejection reason</div><div className="font-medium text-rust">{detailModal.reject_reason}</div></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
