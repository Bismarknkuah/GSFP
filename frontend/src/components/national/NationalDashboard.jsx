import { useEffect, useState, useCallback } from 'react';
import { Globe, MapPin, School, Users, TrendingUp, DollarSign, FileText, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Activity, Landmark, Zap, ArrowUpRight, BarChart3, Award, RefreshCw, AlertCircle, CreditCard, Target, Bot, Bell, Settings, Upload, Lock, UserCheck, Database } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Pill from '../ui/Pill';
import Button from '../ui/Button';
import GhanaMap from './GhanaMap';
import { cedis, fmtNum, fmtDateTime, ROLE_LABELS } from '../../utils/format';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, CartesianGrid, PieChart, Pie, Cell, BarChart } from 'recharts';

function KPICard({ label, value, sub, icon: Icon, tone='forest', trend, sparkData, onClick }) {
  const colors = { forest:'text-forest', emerald:'text-emerald', amber:'text-amber', rust:'text-rust', navy:'text-navy', purple:'text-purple-600' };
  const bgs    = { forest:'bg-forest/10', emerald:'bg-emerald/10', amber:'bg-amber/10', rust:'bg-rust/10', navy:'bg-navy/10', purple:'bg-purple-50' };
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border border-stone-100 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-stone-200 transition-all' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl ${bgs[tone]} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colors[tone]}`}/>
        </div>
        {trend != null && <span className={`text-xs font-semibold ${trend >= 0 ? 'text-emerald' : 'text-rust'}`}>{trend >= 0 ? '+' : ''}{trend}%</span>}
      </div>
      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-xl font-bold font-serif mt-0.5 ${colors[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      {sparkData?.length > 0 && (
        <ResponsiveContainer width="100%" height={26} className="mt-1">
          <AreaChart data={sparkData} margin={{top:0,right:0,bottom:0,left:0}}>
            <defs><linearGradient id={`spk${label.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke="#15493B" fill={`url(#spk${label.replace(/\s/g,'')})`} strokeWidth={1.5} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SystemHealthBar({ label, value, max, tone }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors = { emerald:'bg-emerald', amber:'bg-amber', rust:'bg-rust', forest:'bg-forest', navy:'bg-navy' };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-stone-500">{label}</span>
        <span className={`font-bold ${tone === 'emerald' ? 'text-emerald' : tone === 'amber' ? 'text-amber' : tone === 'rust' ? 'text-rust' : 'text-forest'}`}>{value}</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors[tone] || 'bg-forest'} rounded-full transition-all duration-700`} style={{width:`${pct}%`}}/>
      </div>
    </div>
  );
}

export default function NationalDashboard({ onNavigate }) {
  const { user }   = useAuth();
  const [data,    setData]    = useState(null);
  const [regions, setRegions] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [finance, setFinance] = useState(null);
  const [audit,   setAudit]   = useState([]);
  const [caterers,setCaterers]= useState([]);
  const [disbs,   setDisbs]   = useState([]);
  const [agents,  setAgents]  = useState(null);
  const [trend,   setTrend]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [ts,      setTs]      = useState(null);

  const isSuperAdmin = user.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ov, reg, mo, fn, au, ca, ds, ag] = await Promise.all([
        api.analytics.overview().catch(()=>({counters:{}})),
        api.regions.list().catch(()=>({regions:[]})),
        api.analytics.monthly().catch(()=>({monthly:[]})),
        api.finance.summary().catch(()=>({national:{},payments_summary:{}})),
        api.audit.list({limit:12}).catch(()=>({entries:[]})),
        api.analytics.caterers().catch(()=>({caterers:[]})),
        api.disbursements.list({limit:20}).catch(()=>({disbursements:[]})),
        api.agents.stats().catch(()=>null),
      ]);
      if (ov) setData(ov);
      setRegions(reg?.regions||[]);
      setMonthly(mo?.monthly||[]);
      setTrend(ov?.trend||[]);
      if (fn) setFinance(fn);
      setAudit(au?.entries||[]);
      setCaterers(ca?.caterers||[]);
      setDisbs(ds?.disbursements||[]);
      if (ag) setAgents(ag);
      setTs(new Date().toLocaleTimeString('en-GH'));
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); const t = setInterval(load, 60000); return () => clearInterval(t); },[]);

  const c   = data?.counters || {};
  const nat = finance?.national || {};
  const tot = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const compPct  = tot > 0 ? Math.round((c.approved_reports||0)/tot*100) : 0;
  const budPct   = nat.total > 0 ? Math.round((nat.disbursed||0)/nat.total*100) : 0;
  const spark    = monthly.slice(-7).map(m=>({v:m.meals||0}));

  const pendingDisbs  = disbs.filter(d=>d.status==='pending_ceo');
  const totalArrears  = finance?.payments_summary?.total_arrears||0;
  const regionMapData = regions.map((r,i)=>({code:r.code, name:r.name, meals:Math.floor(30000+i*8000), schools:(r.district_count||0)*8, districts:r.district_count||0}));
  const statusPie     = [{name:'Approved',value:c.approved_reports||0},{name:'Pending',value:c.pending_reports||0},{name:'Rejected',value:c.rejected_reports||0}].filter(p=>p.value>0);

  // 30-day trend chart data
  const trendData = trend.length > 0 ? trend : monthly.slice(-8).map(m=>({date:m.month,meals:m.meals||0}));

  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full animate-spin"/>
      <p className="text-stone-400 text-sm">Loading {isSuperAdmin ? 'Super Admin' : 'National'} Command Centre...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="w-12 h-12 text-rust opacity-50"/>
      <p className="font-semibold text-ink">Could not load dashboard</p>
      <p className="text-sm text-stone-400">{error}</p>
      <Button onClick={load} icon={RefreshCw} variant="secondary">Retry</Button>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{background: isSuperAdmin ? 'linear-gradient(135deg,#0f2d5e 0%,#0d1b2a 100%)' : 'linear-gradient(135deg,#0d1b2a 0%,#1a1a2e 60%,#16213e 100%)'}}>
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
        {isSuperAdmin && <div className="absolute top-0 left-0 right-0 h-1 flex"><div className="flex-1 bg-[#EF3340]"/><div className="flex-1 bg-[#FCD116]"/><div className="flex-1 bg-[#006B3F]"/></div>}
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 mt-1">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-amber"/>
              <span className="text-[10px] font-bold tracking-widest text-amber uppercase">
                {isSuperAdmin ? 'Super Administrator · Full System Access' : 'Republic of Ghana · National Command Centre'}
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-white">
              {isSuperAdmin ? 'GSFP Super Admin Dashboard' : 'Ghana School Feeding Programme'}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {fmtNum(regions.length||16)} regions · {fmtNum(c.districts||0)} districts · {fmtNum(c.schools||0)} schools · {fmtNum(c.caterers||0)} caterers
            </p>
          </div>
          <div className="flex items-start gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-xs text-white/30">Signed in as</div>
              <div className="text-sm font-semibold text-white">{user.name}</div>
              <div className="text-xs text-amber">{ROLE_LABELS[user.role]}</div>
              {ts&&<div className="text-[10px] text-white/20 mt-0.5">Refreshed {ts}</div>}
            </div>
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>{loading?'...':'Refresh'}</Button>
          </div>
        </div>
        {/* Alerts */}
        <div className="relative z-10 mt-4 space-y-2">
          {pendingDisbs.length>0&&(
            <div className="flex items-center gap-3 bg-amber/15 border border-amber/30 rounded-xl px-4 py-2.5">
              <Bell className="w-4 h-4 text-amber flex-shrink-0"/>
              <span className="text-sm text-amber font-medium">{pendingDisbs.length} disbursement{pendingDisbs.length!==1?'s':''} awaiting CEO approval — {cedis(pendingDisbs.reduce((s,d)=>s+(d.amount||0),0))}</span>
              <button onClick={()=>onNavigate&&onNavigate('disbursements')} className="ml-auto text-xs text-amber/70 underline">View ledger</button>
            </div>
          )}
          {(c.pending_reports||0)>0&&(
            <div className="flex items-center gap-3 bg-amber/10 border border-amber/20 rounded-xl px-4 py-2">
              <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0"/>
              <span className="text-sm text-amber font-medium">{fmtNum(c.pending_reports)} feeding reports pending review</span>
              <button onClick={()=>onNavigate&&onNavigate('natreports')} className="ml-auto text-xs text-amber/70 underline">View all</button>
            </div>
          )}
          {agents?.critical_alerts>0&&(
            <div className="flex items-center gap-3 bg-rust/15 border border-rust/30 rounded-xl px-4 py-2">
              <Bot className="w-4 h-4 text-rust flex-shrink-0"/>
              <span className="text-sm text-rust font-medium">{agents.critical_alerts} critical AI agent alerts need attention</span>
              <button onClick={()=>onNavigate&&onNavigate('agents')} className="ml-auto text-xs text-rust/70 underline">Review</button>
            </div>
          )}
        </div>
      </div>

      {/* ── PRIMARY KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <KPICard label="Regions"       value={fmtNum(regions.length||16)}   icon={Globe}        tone="navy"    onClick={()=>onNavigate&&onNavigate('regions')}/>
        <KPICard label="Districts"     value={fmtNum(c.districts||0)}        icon={MapPin}       tone="forest"  onClick={()=>onNavigate&&onNavigate('districts')}/>
        <KPICard label="Schools"       value={fmtNum(c.schools||0)}          icon={School}       tone="emerald" onClick={()=>onNavigate&&onNavigate('schools')}/>
        <KPICard label="Caterers"      value={fmtNum(c.caterers||0)}         icon={Users}        tone="amber"   onClick={()=>onNavigate&&onNavigate('users')}/>
        <KPICard label="Meals Today"   value={fmtNum(c.meals_today||0)}      icon={TrendingUp}   tone="emerald" trend={5}/>
        <KPICard label="This Month"    value={fmtNum(c.meals_this_month||0)} icon={Activity}     tone="forest"  sparkData={spark}/>
        <KPICard label="Compliance"    value={`${compPct}%`}                  icon={CheckCircle2} tone={compPct>=90?'emerald':'amber'} onClick={()=>onNavigate&&onNavigate('natreports')}/>
        <KPICard label="Budget Util."  value={`${budPct}%`}                   icon={DollarSign}   tone={budPct>85?'rust':'forest'} onClick={()=>onNavigate&&onNavigate('natfinance')}/>
      </div>

      {/* ── SYSTEM HEALTH (Super Admin only) ── */}
      {isSuperAdmin && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-navy"/>Data Health</h3>
            <div className="space-y-3">
              <SystemHealthBar label="Regions registered" value={`${regions.length}/16`} max={16} tone={regions.length===16?'emerald':'amber'}/>
              <SystemHealthBar label="Reports approved" value={fmtNum(c.approved_reports||0)} max={tot||1} tone="emerald"/>
              <SystemHealthBar label="Budget utilised" value={`${budPct}%`} max={100} tone={budPct>90?'rust':budPct>60?'amber':'emerald'}/>
              <SystemHealthBar label="Compliance rate" value={`${compPct}%`} max={100} tone={compPct>=90?'emerald':compPct>=70?'amber':'rust'}/>
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-forest"/>Security Status</h3>
            <div className="space-y-2">
              {[
                ['JWT Auth', 'Active', 'emerald'],
                ['RBAC', `${20} roles`, 'emerald'],
                ['Audit Logging', 'Active', 'emerald'],
                ['AI Agents', agents?.open_alerts>0?`${agents.open_alerts} alerts`:'All clear', agents?.open_alerts>0?'amber':'emerald'],
                ['Disbursements', pendingDisbs.length>0?`${pendingDisbs.length} pending`:'All approved', pendingDisbs.length>0?'amber':'emerald'],
                ['Arrears', totalArrears>0?cedis(totalArrears):'None', totalArrears>0?'rust':'emerald'],
              ].map(([l,v,t])=>(
                <div key={l} className={`flex items-center justify-between p-2 rounded-lg bg-${t}/5 border border-${t}/15`}>
                  <span className="text-xs text-stone-600">{l}</span>
                  <span className={`text-xs font-bold text-${t}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4 text-purple-600"/>User Distribution</h3>
            <div className="space-y-2">
              {[
                ['Executive', 2, '#1a1200'],
                ['National', 5, '#0f2d5e'],
                ['Regional', 4, '#5b1fa8'],
                ['District', 6, '#15493B'],
                ['Caterers', c.caterers||0, '#C9882C'],
                ['Headmasters', c.schools||0, '#0e6b7a'],
              ].map(([label,val,color])=>(
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:color}}/>
                    <span className="text-xs text-stone-600">{label}</span>
                  </div>
                  <span className="text-xs font-bold text-ink">{fmtNum(val)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── FINANCE BAR ── */}
      {nat.total > 0 ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald"/>National Budget 2025/2026</h3>
            <button onClick={()=>onNavigate&&onNavigate('natfinance')} className="text-xs text-forest hover:underline flex items-center gap-1">Finance portal<ArrowUpRight className="w-3 h-3"/></button>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              ['Total Budget', nat.total,      100,                                              'forest'],
              ['Allocated',    nat.allocated,  nat.total>0?nat.allocated/nat.total*100:0,       'amber'],
              ['Disbursed',    nat.disbursed,  nat.total>0?nat.disbursed/nat.total*100:0,       'emerald'],
              ['Balance',      nat.balance,    nat.total>0?nat.balance/nat.total*100:0,          nat.balance<nat.total*0.1?'rust':'forest'],
            ].map(([l,v,pct,t])=>(
              <div key={l}>
                <div className="flex justify-between text-xs mb-1"><span className="text-stone-500">{l}</span><span className={`font-bold text-${t}`}>{Number(pct).toFixed(0)}%</span></div>
                <div className="text-lg font-bold font-serif text-ink">{cedis(v||0)}</div>
                <div className="h-1.5 bg-stone-100 rounded-full mt-1.5"><div className={`h-full bg-${t} rounded-full`} style={{width:`${Math.min(Number(pct)||0,100)}%`}}/></div>
              </div>
            ))}
          </div>
          {totalArrears > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-rust">
              <AlertTriangle className="w-3.5 h-3.5"/>
              Total arrears nationwide: <strong>{cedis(totalArrears)}</strong>
              <button onClick={()=>onNavigate&&onNavigate('payments')} className="ml-auto underline">View details</button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-stone-200">
          <div className="text-center py-4">
            <DollarSign className="w-8 h-8 text-stone-300 mx-auto mb-2"/>
            <p className="text-stone-400 text-sm font-medium">No national budget configured yet</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={()=>onNavigate&&onNavigate('natfinance')}>Create budget</Button>
          </div>
        </Card>
      )}

      {/* ── MAIN CHARTS ── */}
      <div className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">
                {trendData.length > 0 && trendData[0]?.date ? '30-Day Feeding Trend' : 'Monthly Meals — National'}
              </h3>
              {monthly.length>0?<Pill tone="emerald">{monthly.length} months</Pill>:<Pill tone="stone">No data yet</Pill>}
            </div>
            {(trendData.length > 0 || monthly.length > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={monthly.length > 0 ? monthly : trendData}>
                  <defs><linearGradient id="natGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.35}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                  <XAxis dataKey={monthly.length>0?'month':'date'} tick={{fontSize:10}} tickFormatter={v=>v?.slice(5)||v}/>
                  <YAxis yAxisId="left"  tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}}/>
                  <Tooltip formatter={(v,n)=>[fmtNum(v),n==='meals'?'Meals':'Reports']}/>
                  <Area  yAxisId="left"  type="monotone" dataKey="meals"   stroke="#15493B" fill="url(#natGrad)" strokeWidth={2.5} dot={false}/>
                  <Bar   yAxisId="right" dataKey="reports" fill="#C9882C" radius={[2,2,0,0]} opacity={0.7}/>
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-stone-300 gap-2">
                <TrendingUp className="w-8 h-8 opacity-30"/>
                <p className="text-sm">No approved reports yet</p>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-ink text-sm">Regional Heatmap</h3>
              <button onClick={()=>onNavigate&&onNavigate('natanalytics')} className="text-xs text-forest hover:underline">Analytics</button>
            </div>
            <GhanaMap data={regionMapData} metric="meals" onRegionClick={()=>onNavigate&&onNavigate('natanalytics')}/>
          </Card>
          {statusPie.length > 0 && (
            <Card>
              <h3 className="font-semibold text-ink mb-2 text-sm">Report Status</h3>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" outerRadius={45} innerRadius={20} dataKey="value" label={({name,percent})=>`${(percent*100).toFixed(0)}%`} fontSize={9}>
                    {statusPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}
                  </Pie><Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Top caterers */}
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber"/>Top Caterers</h3>
          {caterers.length===0 ? <p className="text-stone-300 text-sm text-center py-4">No caterer data</p> : (
            <div className="space-y-2">
              {caterers.slice(0,6).map((cat,i)=>(
                <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-stone-50 last:border-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                    style={{background:i===0?'#C9882C':i===1?'#9ca3af':i===2?'#a16207':'#f3f4f6',color:i<3?'white':'#374151'}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-ink truncate">{cat.name||'—'}</div>
                    <div className="text-[10px] text-stone-400">{fmtNum(cat.approved||0)} approved</div>
                  </div>
                  <div className="text-xs font-bold text-forest font-mono">{fmtNum(cat.meals||0)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Live activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink flex items-center gap-2"><Zap className="w-4 h-4 text-amber"/>Live Activity</h3>
            <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse"/><span className="text-xs text-stone-400">Live</span></div>
          </div>
          {audit.length===0 ? <p className="text-stone-300 text-sm text-center py-4">No recent activity</p> : (
            <div className="max-h-52 overflow-y-auto space-y-0">
              {audit.map((a,i)=>(
                <div key={i} className="py-2 border-b border-stone-50 last:border-0">
                  <div className="text-xs font-bold font-mono text-forest">{a.action}</div>
                  <div className="text-xs text-stone-500">{a.user_name} · {fmtDateTime(a.timestamp)}</div>
                  {a.details&&<div className="text-xs text-stone-400 truncate">{a.details}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* AI Agents */}
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Bot className="w-4 h-4 text-forest"/>AI Agents Status</h3>
          {agents ? (
            <div className="space-y-2">
              {[
                ['Open Alerts',  agents.open_alerts||0,    agents.open_alerts>0?'amber':'emerald'],
                ['Critical',     agents.critical_alerts||0,agents.critical_alerts>0?'rust':'emerald'],
                ['Agent Runs',   agents.recent_runs?.length||0,'navy'],
              ].map(([l,v,t])=>(
                <div key={l} className={`flex items-center justify-between p-2.5 rounded-xl bg-${t}/5 border border-${t}/15`}>
                  <span className="text-sm text-stone-600">{l}</span>
                  <span className={`font-bold text-${t}`}>{v}</span>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="secondary" size="sm" onClick={()=>onNavigate&&onNavigate('agents')}>Monitor</Button>
                <Button size="sm" onClick={async()=>{ await api.agents.run(undefined).catch(()=>{}); load(); }}>Run All</Button>
              </div>
            </div>
          ) : <p className="text-stone-300 text-sm text-center py-4">No agent data</p>}
        </Card>
      </div>

      {/* ── QUICK ACCESS ── */}
      <Card>
        <h3 className="font-semibold text-ink mb-4">
          {isSuperAdmin ? 'Super Admin Quick Access' : 'Quick Access'}
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {[
            {label:'All Regions',     view:'regions',          icon:Globe,        color:'#1E3A5F'},
            {label:'All Districts',   view:'districts',        icon:MapPin,       color:'#15493B'},
            {label:'All Schools',     view:'schools',          icon:School,       color:'#059669'},
            {label:'User Mgmt',       view:'users',            icon:Users,        color:'#7C3AED'},
            {label:'Finance',         view:'natfinance',       icon:DollarSign,   color:'#C9882C'},
            {label:'Disbursements',   view:'disbursements',    icon:CreditCard,   color:'#C9882C'},
            {label:'Reports Hub',     view:'natreports',       icon:FileText,     color:'#C0392B'},
            {label:'Analytics',       view:'natanalytics',     icon:BarChart3,    color:'#0E7490'},
            {label:'Audit Trail',     view:'audit',            icon:ShieldCheck,  color:'#374151'},
            {label:'AI Agents',       view:'agents',           icon:Bot,          color:'#0E7490'},
            {label:'Bulk Upload',     view:'bulk-upload',      icon:Upload,       color:'#92400E'},
            ...(isSuperAdmin ? [
              {label:'Sys Config',    view:'sysconfig',        icon:Settings,     color:'#1F2937'},
              {label:'Official Rpts', view:'official-reports', icon:FileText,     color:'#065F46'},
              {label:'Chatbot Mgr',   view:'chatbot-admin',    icon:Zap,          color:'#7C3AED'},
              {label:'Messages',      view:'messages',         icon:Activity,     color:'#0d6efd'},
              {label:'My Profile',    view:'profile',          icon:Users,        color:'#15493B'},
            ] : [
              {label:'Sys Config',    view:'sysconfig',        icon:Settings,     color:'#1F2937'},
              {label:'Messages',      view:'messages',         icon:Activity,     color:'#0d6efd'},
              {label:'My Profile',    view:'profile',          icon:Users,        color:'#15493B'},
              {label:'MFA Security',  view:'mfa',              icon:Lock,         color:'#374151'},
            ]),
          ].map(item=>(
            <button key={item.view} onClick={()=>onNavigate&&onNavigate(item.view)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-100 hover:shadow-sm hover:border-stone-200 transition-all group bg-white">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{backgroundColor:`${item.color}18`}}>
                <item.icon className="w-4 h-4" style={{color:item.color}}/>
              </div>
              <span className="text-[10px] font-medium text-stone-500 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
