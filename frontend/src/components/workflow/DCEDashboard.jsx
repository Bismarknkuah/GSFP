import { useEffect, useState } from 'react';
import { ClipboardCheck, FileText, CheckCircle2, XCircle, Clock, Users, School, BarChart3, Send } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import { fmtDateTime, fmtNum, cedis, ROLE_LABELS } from '../../utils/format';

export default function DCEDashboard() {
  const { user } = useAuth();
  const [inbox,   setInbox]  = useState([]);
  const [stats,   setStats]  = useState(null);
  const [detail,  setDetail] = useState(null);
  const [actMode, setAct]    = useState(null);
  const [actForm, setActForm]= useState({ action:'', comment:'', analysis:'' });
  const [err,     setErr]    = useState(null);
  const [ok,      setOk]     = useState(null);
  const [busy,    setBusy]   = useState(false);
  const [overview,setOv]     = useState(null);

  const load = () => {
    Promise.allSettled([
      api.officialReports.list({ box:'inbox' }),
      api.officialReports.stats(),
      api.analytics.overview(),
    ]).then(([inRes,stRes,ovRes])=>{
      if(inRes.status==='fulfilled') setInbox(inRes.value?.reports||[]);
      if(stRes.status==='fulfilled') setStats(stRes.value);
      if(ovRes.status==='fulfilled') setOv(ovRes.value?.counters||{});
    }).catch(console.error);
  };
  useEffect(()=>{ load(); },[]);

  const doAction = async () => {
    if (!actForm.action) return;
    if (actForm.action==='reject'&&!actForm.comment) { setErr('Rejection reason required'); return; }
    setBusy(true); setErr(null);
    try {
      await api.officialReports.action(actMode._id||actMode.id, { ...actForm, rejection_reason:actForm.comment });
      setOk(`Report ${actForm.action}d and forwarded to Regional Coordinator.`);
      setAct(null); setActForm({ action:'', comment:'', analysis:'' }); load();
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };

  const c = overview||{};
  const pending = inbox.filter(r=>['with_dce','pending'].includes(r.status));

  return (
    <div className="space-y-6">
      <PageHeader title="DCE Dashboard" subtitle={`${user.name} — District Chief Executive. Review and approve district reports before regional forwarding.`}/>

      {ok&&<div className="p-3 bg-emerald/10 text-emerald rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="p-3 bg-rust/10 text-rust rounded-xl text-sm">{err}</div>}

      {/* Alert */}
      {pending.length>0&&(
        <div className="p-4 bg-amber/10 border-2 border-amber/30 rounded-2xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-amber">{pending.length} report{pending.length!==1?'s':''} awaiting your approval</p>
            <p className="text-sm text-stone-600 mt-0.5">All district reports must be approved by the DCE before they are forwarded to the Regional Coordinator.</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Inbox" value={stats?.inbox||0} icon={ClipboardCheck} tone="amber"/>
        <KPI label="Schools" value={fmtNum(c.schools||0)} icon={School} tone="forest"/>
        <KPI label="Pending Reports" value={fmtNum(c.pending_reports||0)} icon={Clock} tone="amber"/>
        <KPI label="Compliance" value={`${(c.approved_reports||0)+(c.pending_reports||0)>0?Math.round((c.approved_reports||0)/((c.approved_reports||0)+(c.pending_reports||0))*100):0}%`} icon={BarChart3} tone="emerald"/>
      </div>

      {/* Pending reports */}
      <Card>
        <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-amber"/>Reports Awaiting Your Approval ({pending.length})</h3>
        {pending.length===0
          ? <p className="text-stone-300 text-sm text-center py-8">No reports pending — all up to date.</p>
          : <div className="space-y-3">
              {pending.map(rpt=>(
                <div key={rpt._id||rpt.id} className="border border-amber/30 bg-amber/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Pill tone="stone">{rpt.report_type}</Pill>
                        <span className="text-xs text-stone-400">{rpt.reference}</span>
                      </div>
                      <h4 className="font-semibold text-ink">{rpt.subject}</h4>
                      <p className="text-xs text-stone-500 mt-0.5">From: <strong>{rpt.submitted_by_name}</strong> ({ROLE_LABELS[rpt.submitted_by_role]||rpt.submitted_by_role}) · {rpt.period} · {fmtDateTime(rpt.submitted_at)}</p>
                      {rpt.total_meals>0&&<div className="flex gap-4 mt-2 text-xs text-stone-500">
                        <span>Meals: <strong className="text-forest">{fmtNum(rpt.total_meals)}</strong></span>
                        <span>Paid: <strong className="text-emerald">{cedis(rpt.total_paid)}</strong></span>
                        {rpt.total_arrears>0&&<span>Arrears: <strong className="text-rust">{cedis(rpt.total_arrears)}</strong></span>}
                        <span>Compliance: <strong className="text-amber">{rpt.compliance_rate}%</strong></span>
                      </div>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="secondary" onClick={()=>setDetail(rpt)}>View</Button>
                      <Button size="sm" onClick={()=>{ setAct(rpt); setActForm({action:'',comment:'',analysis:''}); setErr(null); }}>Review</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>

      {/* All inbox */}
      {inbox.filter(r=>!['with_dce','pending'].includes(r.status)).length>0&&(
        <Card>
          <h3 className="font-semibold text-ink mb-3">Previously Processed</h3>
          <div className="space-y-2">
            {inbox.filter(r=>!['with_dce','pending'].includes(r.status)).map(rpt=>(
              <div key={rpt._id||rpt.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                <div><div className="font-semibold text-ink text-sm">{rpt.subject}</div><div className="text-xs text-stone-400">{rpt.submitted_by_name} · {rpt.period}</div></div>
                <div className="flex items-center gap-2">
                  <Pill tone={rpt.status==='rejected'?'rust':'emerald'}>{rpt.status}</Pill>
                  <Button size="sm" variant="ghost" onClick={()=>setDetail(rpt)}>View</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* View modal */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail?.subject||''} size="lg">
        {detail&&(
          <div className="space-y-3">
            <p className="text-xs text-stone-400">From: <strong>{detail.submitted_by_name}</strong> · {detail.period} · {fmtDateTime(detail.submitted_at)}</p>
            {detail.total_meals>0&&(
              <div className="grid grid-cols-4 gap-2">
                {[[`${fmtNum(detail.total_meals)}`,'Meals','emerald'],[cedis(detail.total_paid),'Paid','forest'],[cedis(detail.total_arrears),'Arrears','rust'],[`${detail.compliance_rate}%`,'Compliance','amber']].map(([v,l,t])=>(
                  <div key={l} className={`bg-${t}/5 rounded-xl p-3 text-center`}><div className={`font-bold text-${t}`}>{v}</div><div className="text-xs text-stone-400">{l}</div></div>
                ))}
              </div>
            )}
            <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-700 whitespace-pre-line">{detail.content}</div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Approval Chain</h4>
              {(detail.chain||[]).map((e,i)=>(
                <div key={i} className="flex items-start gap-2 p-2 bg-stone-50 rounded-lg">
                  <Pill tone={e.action==='approved'?'emerald':e.action==='rejected'?'rust':'stone'}>{e.action}</Pill>
                  <div><div className="text-xs font-medium text-ink">{e.actor_name} ({ROLE_LABELS[e.actor_role]||e.actor_role})</div>{e.comment&&<div className="text-xs text-stone-400">{e.comment}</div>}</div>
                  <span className="ml-auto text-xs text-stone-300">{fmtDateTime(e.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Action modal */}
      <Modal open={!!actMode} onClose={()=>setAct(null)} title="Review & Approve" size="md">
        {err&&<div className="mb-3 text-sm text-rust bg-rust/10 rounded-lg p-2">{err}</div>}
        {actMode&&(
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-3"><div className="font-semibold text-ink">{actMode.subject}</div><div className="text-xs text-stone-400">From: {actMode.submitted_by_name} · {actMode.period}</div></div>
            <Textarea label="Your analysis / comments" value={actForm.analysis} onChange={e=>setActForm(f=>({...f,analysis:e.target.value}))} rows={3} placeholder="Provide analysis or observations..."/>
            <Textarea label="Comment" value={actForm.comment} onChange={e=>setActForm(f=>({...f,comment:e.target.value}))} rows={2} placeholder="Add a comment..."/>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>setActForm(f=>({...f,action:'approve'}))} className={`py-3 rounded-xl font-semibold border-2 transition-all ${actForm.action==='approve'?'border-emerald bg-emerald text-white':'border-stone-200 text-stone-600 hover:border-emerald/50'}`}>Approve & Forward to RFC</button>
              <button onClick={()=>setActForm(f=>({...f,action:'reject'}))} className={`py-3 rounded-xl font-semibold border-2 transition-all ${actForm.action==='reject'?'border-rust bg-rust text-white':'border-stone-200 text-stone-600 hover:border-rust/50'}`}>Reject</button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={()=>setAct(null)} disabled={busy}>Cancel</Button>
              <Button onClick={doAction} disabled={busy||!actForm.action}>{busy?'Processing...':'Submit Decision'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
