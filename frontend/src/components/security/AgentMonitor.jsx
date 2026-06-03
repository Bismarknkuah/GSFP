import { useEffect, useState, useCallback } from 'react';
import { Bot, Play, AlertTriangle, CheckCircle2, Clock, Shield, TrendingUp, Eye, RefreshCw, XCircle, Activity, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import EmptyState from '../ui/EmptyState';
import { fmtDateTime, fmtNum } from '../../utils/format';

const AGENT_CONFIG = {
  compliance:   { label:'Compliance Monitor',      icon:'📋', color:'bg-blue-500',   desc:'Checks daily report submission rates' },
  fraud:        { label:'Fraud Detection Agent',   icon:'🔍', color:'bg-red-500',    desc:'Detects anomalous payment patterns' },
  financial:    { label:'Financial Audit Agent',   icon:'💰', color:'bg-amber-500',  desc:'Reviews budget and disbursement irregularities' },
  data_quality: { label:'Data Quality Agent',      icon:'📊', color:'bg-purple-500', desc:'Validates data integrity and consistency' },
  security:     { label:'Security Agent',          icon:'🛡️', color:'bg-forest',     desc:'Monitors identity verification and access' },
};

const SEV_CONFIG = {
  critical: { tone:'rust',    icon:XCircle,       label:'Critical' },
  warning:  { tone:'amber',   icon:AlertTriangle, label:'Warning' },
  info:     { tone:'forest',  icon:CheckCircle2,  label:'Info' },
};

function AlertCard({ alert, onAcknowledge, onResolve }) {
  const sev = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border rounded-xl p-4 ${alert.severity==='critical'?'border-rust/30 bg-rust/5':alert.severity==='warning'?'border-amber/30 bg-amber/5':'border-stone-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <sev.icon className={`w-4 h-4 text-${sev.tone} flex-shrink-0 mt-0.5`}/>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink text-sm">{alert.title}</span>
              <Pill tone={sev.tone}>{sev.label}</Pill>
              <Pill tone="stone">{AGENT_CONFIG[alert.agent_type]?.label||alert.agent_type}</Pill>
            </div>
            <p className="text-xs text-stone-500 mt-1">{fmtDateTime(alert.created_at)}</p>
            {expanded && <p className="text-sm text-stone-600 mt-2 leading-relaxed">{alert.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={()=>setExpanded(!expanded)} className="p-1 hover:bg-stone-100 rounded">
            {expanded?<ChevronDown className="w-4 h-4 text-stone-400"/>:<ChevronRight className="w-4 h-4 text-stone-400"/>}
          </button>
          {alert.status==='open'&&(
            <>
              <button onClick={()=>onAcknowledge(alert._id||alert.id)} className="px-2 py-1 text-xs bg-amber/10 text-amber rounded-lg hover:bg-amber/20 font-medium">ACK</button>
              <button onClick={()=>onResolve(alert)} className="px-2 py-1 text-xs bg-emerald/10 text-emerald rounded-lg hover:bg-emerald/20 font-medium">Resolve</button>
            </>
          )}
          {alert.status==='acknowledged'&&<Pill tone="amber">Acknowledged</Pill>}
          {alert.status==='resolved'&&<Pill tone="emerald">Resolved</Pill>}
        </div>
      </div>
    </div>
  );
}

export default function AgentMonitor() {
  const [stats,     setStats]     = useState(null);
  const [alerts,    setAlerts]    = useState([]);
  const [agents,    setAgents]    = useState([]);
  const [runs,      setRuns]      = useState([]);
  const [filter,    setFilter]    = useState({ type:'', severity:'', status:'open' });
  const [running,   setRunning]   = useState(null);
  const [resolveModal,setResModal]= useState(null);
  const [resNote,   setResNote]   = useState('');
  const [tab,       setTab]       = useState('alerts');
  const [err,       setErr]       = useState(null);
  const [ok,        setOk]        = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.agents.stats(), api.agents.alerts(filter), api.agents.list(), api.agents.runs(),
    ]).then(([st,al,ag,ru])=>{
      if(st.status==='fulfilled') setStats(st.value);
      if(al.status==='fulfilled') setAlerts(al.value?.alerts||[]);
      if(ag.status==='fulfilled') setAgents(ag.value?.agents||[]);
      if(ru.status==='fulfilled') setRuns(ru.value?.runs||[]);
    }).catch(console.error);
  },[filter]);

  useEffect(()=>{ load(); },[filter]);

  const runAgent = async (type) => {
    setRunning(type||'all'); setErr(null);
    try {
      const r = await api.agents.run(type||undefined);
      const total = r.results?.reduce((s,a)=>s+(a.new_alerts||0),0)||0;
      setOk(`Agents completed — ${total} new alert${total!==1?'s':''} created.`);
      load();
    } catch(e) { setErr(e.message); }
    finally { setRunning(null); }
  };

  const acknowledge = async (id) => {
    await api.agents.acknowledge(id).catch(e=>setErr(e.message));
    setOk('Alert acknowledged.'); load();
  };

  const resolve = async () => {
    await api.agents.resolve(resolveModal._id||resolveModal.id, resNote).catch(e=>setErr(e.message));
    setOk('Alert resolved.'); setResModal(null); setResNote(''); load();
  };

  const s = stats||{};

  return (
    <>
      <PageHeader title="AI Agent Monitor" subtitle="5 specialized agents continuously monitor compliance, fraud, finance, data quality and security.">
        <div className="flex gap-2">
          <Button icon={RefreshCw} variant="secondary" onClick={load} size="sm">Refresh</Button>
          <Button icon={Play} onClick={()=>runAgent(null)} disabled={!!running}>
            {running==='all'?'Running...':'Run All Agents'}
          </Button>
        </div>
      </PageHeader>

      {ok&&<div className="mb-4 p-3 bg-emerald/10 border border-emerald/20 rounded-xl text-sm text-emerald flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{ok}</div>}
      {err&&<div className="mb-4 p-3 bg-rust/10 rounded-xl text-sm text-rust">{err}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          ['Open Alerts',    s.open_alerts||0,    s.open_alerts>0?'amber':'emerald',  AlertTriangle],
          ['Critical',       s.critical_alerts||0, s.critical_alerts>0?'rust':'emerald', XCircle],
          ['Acknowledged',   alerts.filter(a=>a.status==='acknowledged').length, 'amber', Clock],
          ['Resolved Today', alerts.filter(a=>a.status==='resolved').length, 'emerald', CheckCircle2],
        ].map(([l,v,t,Icon])=>(
          <Card key={l} className="text-center py-4">
            <Icon className={`w-5 h-5 mx-auto mb-1 text-${t}`}/>
            <div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-xs text-stone-400 mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {Object.entries(AGENT_CONFIG).map(([type,cfg])=>(
          <Card key={type} className="text-center">
            <div className="text-2xl mb-1">{cfg.icon}</div>
            <div className="font-semibold text-ink text-xs leading-tight mb-1">{cfg.label}</div>
            <div className="text-[10px] text-stone-400 mb-2 leading-tight">{cfg.desc}</div>
            <div className="text-xs font-semibold text-amber mb-2">{s.by_type?.[type]||0} open alerts</div>
            <Button size="sm" variant="secondary" className="w-full" onClick={()=>runAgent(type)} disabled={!!running}>
              {running===type?'Running...':'Run'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['alerts','runs'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-forest text-white':'bg-white border border-stone-200 text-stone-600'}`}>
            {t==='alerts'?`Alerts (${alerts.length})`:'Agent Runs'}
          </button>
        ))}
      </div>

      {tab==='alerts'&&(
        <>
          <Card className="mb-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Select value={filter.type} onChange={e=>setFilter(f=>({...f,type:e.target.value}))}
                options={[{value:'',label:'All agents'},...Object.entries(AGENT_CONFIG).map(([v,c])=>({value:v,label:c.label}))]}/>
              <Select value={filter.severity} onChange={e=>setFilter(f=>({...f,severity:e.target.value}))}
                options={[{value:'',label:'All severities'},{value:'critical',label:'Critical'},{value:'warning',label:'Warning'},{value:'info',label:'Info'}]}/>
              <Select value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}
                options={[{value:'open',label:'Open'},{value:'acknowledged',label:'Acknowledged'},{value:'resolved',label:'Resolved'},{value:'',label:'All'}]}/>
            </div>
          </Card>
          <div className="space-y-2">
            {alerts.length===0
              ? <Card><EmptyState icon={Shield} title="No alerts" description="All systems normal. Run agents to check for issues."/></Card>
              : alerts.map(a=><AlertCard key={a._id||a.id} alert={a} onAcknowledge={acknowledge} onResolve={setResModal}/>)}
          </div>
        </>
      )}

      {tab==='runs'&&(
        <Card noPadding>
          {runs.length===0?<EmptyState icon={Bot} title="No agent runs yet" description="Click Run All Agents to start monitoring."/>:(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-left px-4 py-3">Agent</th><th className="text-left px-4 py-3">Started</th><th className="text-right px-4 py-3">Findings</th><th className="text-right px-4 py-3">New Alerts</th><th className="text-center px-4 py-3">Status</th><th className="text-left px-4 py-3">Summary</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {runs.map(r=>(
                    <tr key={r._id||r.id} className="hover:bg-paper">
                      <td className="px-4 py-3"><div className="font-medium text-ink text-sm">{r.agent_name}</div></td>
                      <td className="px-4 py-3 text-xs text-stone-500">{fmtDateTime(r.started_at)}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.findings_count||0}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber">{r.alerts_created||0}</td>
                      <td className="px-4 py-3 text-center"><Pill tone={r.status==='completed'?'emerald':r.status==='failed'?'rust':'amber'}>{r.status}</Pill></td>
                      <td className="px-4 py-3 text-xs text-stone-500">{r.summary||r.error||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal open={!!resolveModal} onClose={()=>setResModal(null)} title="Resolve Alert" size="sm">
        <div className="space-y-3">
          <div className="bg-cream rounded-xl p-3 text-sm font-medium text-ink">{resolveModal?.title}</div>
          <Textarea label="Resolution note" value={resNote} onChange={e=>setResNote(e.target.value)} rows={3} placeholder="Describe how this was resolved..."/>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={()=>setResModal(null)}>Cancel</Button>
            <Button onClick={resolve} icon={CheckCircle2}>Mark Resolved</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
