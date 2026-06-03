import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, DollarSign, School, Users, Globe, MapPin, Award, BarChart3, CheckCircle2, AlertTriangle, Clock, Landmark, Activity, FileText, RefreshCw, ShieldCheck, Zap, CreditCard, Target, ArrowUpRight, Bell, TrendingDown } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import Pill from '../ui/Pill';
import GhanaMap from './GhanaMap';
import { cedis, fmtNum, fmtDateTime, ROLE_LABELS } from '../../utils/format';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, CartesianGrid, Legend } from 'recharts';

function StatCard({ value, label, sub, tone='forest', size='lg', icon:Icon, onClick }) {
  const colors = { forest:'from-forest to-[#0f3329]', emerald:'from-emerald to-[#047857]', amber:'from-amber to-[#a0671e]', navy:'from-navy to-[#142d4c]', purple:'from-purple-700 to-purple-900', rust:'from-rust to-[#922b21]' };
  return (
    <div onClick={onClick} className={`bg-gradient-to-br ${colors[tone]||colors.forest} rounded-2xl p-5 text-white relative overflow-hidden ${onClick?'cursor-pointer hover:scale-[1.02] transition-transform':''}`}>
      <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
      <div className="relative z-10">
        {Icon&&<Icon className="w-5 h-5 text-white/50 mb-2"/>}
        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">{label}</p>
        <p className={`font-bold font-serif text-white ${size==='xl'?'text-4xl':size==='lg'?'text-3xl':'text-2xl'}`}>{value}</p>
        {sub&&<p className="text-xs text-white/50 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function AlertBanner({ count, amount, label, tone, onAction, actionLabel }) {
  if (!count) return null;
  const styles = { amber:'bg-amber/15 border-amber/40 text-amber', rust:'bg-rust/15 border-rust/40 text-rust' };
  return (
    <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${styles[tone]||styles.amber}`}>
      <Bell className="w-4 h-4 flex-shrink-0"/>
      <span className="text-sm font-medium">{count} {label} — {cedis(amount)}</span>
      {onAction&&<button onClick={onAction} className="ml-auto text-xs underline opacity-70 hover:opacity-100">{actionLabel||'Review'}</button>}
    </div>
  );
}

export default function ExecutiveDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [ov,    setOv]    = useState(null);
  const [reg,   setReg]   = useState([]);
  const [mon,   setMon]   = useState([]);
  const [fin,   setFin]   = useState(null);
  const [cat,   setCat]   = useState([]);
  const [aud,   setAud]   = useState([]);
  const [disbs, setDisbs] = useState([]);
  const [agents,setAgents]= useState(null);
  const [ts,    setTs]    = useState(null);

  const load = useCallback(()=>{
    Promise.allSettled([
      api.analytics.overview(), api.regions.list(), api.analytics.monthly(),
      api.finance.summary(), api.analytics.caterers(), api.audit.list({limit:8}),
      api.disbursements.list({limit:20}), api.agents.stats(),
    ]).then(([o,r,mo,fn,ca,au,ds,ag])=>{
      if(o.status==='fulfilled')  setOv(o.value);
      if(r.status==='fulfilled')  setReg(r.value?.regions||[]);
      if(mo.status==='fulfilled') setMon(mo.value?.monthly||[]);
      if(fn.status==='fulfilled') setFin(fn.value);
      if(ca.status==='fulfilled') setCat(ca.value?.caterers||[]);
      if(au.status==='fulfilled') setAud(au.value?.entries||[]);
      if(ds.status==='fulfilled') setDisbs(ds.value?.disbursements||[]);
      if(ag.status==='fulfilled') setAgents(ag.value);
      setTs(new Date().toLocaleTimeString('en-GH'));
    });
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,60000); return()=>clearInterval(t); },[]);

  const c    = ov?.counters||{};
  const nat  = fin?.national||{};
  const tot  = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const comp = tot>0?Math.round((c.approved_reports||0)/tot*100):0;
  const budP = nat.total>0?Math.round((nat.disbursed||0)/nat.total*100):0;

  const pendingDisbs  = disbs.filter(d=>d.status==='pending_ceo');
  const pendingAmount = pendingDisbs.reduce((s,d)=>s+(d.amount||0),0);
  const totalArrears  = fin?.payments_summary?.total_arrears||0;

  const statusPie = [{name:'Approved',value:c.approved_reports||0},{name:'Pending',value:c.pending_reports||0},{name:'Rejected',value:c.rejected_reports||0}].filter(p=>p.value>0);

  return (
    <div className="space-y-5">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-2xl p-8" style={{background:'linear-gradient(135deg,#0d1117 0%,#1a1a2e 50%,#16213e 100%)'}}>
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'28px 28px'}}/>
        {/* Ghana flag stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="flex-1 bg-[#EF3340]"/><div className="flex-1 bg-[#FCD116]"/><div className="flex-1 bg-[#006B3F]"/>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-6 mt-2">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"><Landmark className="w-6 h-6 text-white"/></div>
              <div>
                <div className="text-[10px] font-bold tracking-[0.3em] text-amber uppercase">Republic of Ghana · {user.role==='ceo'?'Office of the CEO':'National Coordinating Directorate'}</div>
                <div className="text-base font-semibold text-white/80">Ghana School Feeding Programme</div>
              </div>
            </div>
            <h1 className="font-serif text-4xl font-bold text-white leading-tight">{user.role==='ceo'?'Executive Command Centre':'National Coordination Hub'}</h1>
            <p className="text-white/40 text-sm mt-2 max-w-2xl">{user.role==='ceo'?'Full national oversight — all 16 regions, every district, school and caterer under one executive view.':'Operational coordination across all 16 regions — monitor, direct and optimise national feeding performance.'}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right mb-1">
              <div className="text-white font-bold text-lg">{user.name}</div>
              <div className="text-amber/80 text-xs">{ROLE_LABELS[user.role]}</div>
              {ts&&<div className="text-white/20 text-[10px] mt-0.5">Updated: {ts}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white"><RefreshCw className="w-4 h-4"/></button>
              <button onClick={()=>onNavigate&&onNavigate('natanalytics')} className="px-3 py-2 bg-forest/80 hover:bg-forest rounded-xl text-white text-xs font-semibold flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5"/>Analytics</button>
              <button onClick={()=>onNavigate&&onNavigate('disbursements')} className="px-3 py-2 bg-amber/80 hover:bg-amber rounded-xl text-white text-xs font-semibold flex items-center gap-1"><DollarSign className="w-3.5 h-3.5"/>Disbursements</button>
            </div>
          </div>
        </div>
        {/* Alerts */}
        <div className="relative z-10 mt-5 space-y-2">
          {pendingDisbs.length>0&&<AlertBanner count={pendingDisbs.length} amount={pendingAmount} label={`disbursement${pendingDisbs.length!==1?'s':''} await your approval`} tone="amber" onAction={()=>onNavigate&&onNavigate('disbursements')} actionLabel="Review & approve"/>}
          {c.pending_reports>0&&<AlertBanner count={c.pending_reports} amount={0} label="feeding reports pending headmaster review" tone="amber" onAction={()=>onNavigate&&onNavigate('natreports')} actionLabel="View reports"/>}
          {agents?.critical_alerts>0&&<AlertBanner count={agents.critical_alerts} amount={0} label="critical AI agent alerts require attention" tone="rust" onAction={()=>onNavigate&&onNavigate('agents')} actionLabel="Review alerts"/>}
        </div>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard value={fmtNum(c.meals_all_time||0)} label="Total Meals Served" sub="All time, nationwide" tone="forest" size="xl" icon={TrendingUp} onClick={()=>onNavigate&&onNavigate('natanalytics')}/>
        <StatCard value={fmtNum(c.meals_this_month||0)} label="Meals This Month" sub={`${fmtNum(c.schools||0)} active schools`} tone="emerald" icon={School}/>
        <StatCard value={cedis(nat.total||0)} label="National Budget" sub={`${budP}% utilised · ${cedis(nat.balance||0)} remaining`} tone="navy" icon={DollarSign} onClick={()=>onNavigate&&onNavigate('natfinance')}/>
        <StatCard value={`${comp}%`} label="Compliance Rate" sub={`${fmtNum(c.approved_reports||0)} approved reports`} tone={comp>=90?'emerald':comp>=70?'amber':'rust'} icon={Target}/>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          [16,'Regions','navy',Globe,null],
          [fmtNum(c.districts||0),'Districts','forest',MapPin,null],
          [fmtNum(c.schools||0),'Schools','emerald',School,null],
          [fmtNum(c.caterers||0),'Caterers','amber',Users,null],
          [cedis(totalArrears),'Arrears',totalArrears>0?'rust':'emerald',TrendingDown,null],
          [agents?.open_alerts||0,'AI Alerts',agents?.open_alerts>0?'amber':'emerald',ShieldCheck,'agents'],
        ].map(([v,l,t,Icon,view])=>(
          <Card key={l} className={`text-center py-3 px-2 ${view?'cursor-pointer hover:shadow-md transition-all':''}`} onClick={view?()=>onNavigate&&onNavigate(view):undefined}>
            <Icon className={`w-4 h-4 mx-auto mb-1 text-${t}`}/>
            <div className={`text-base font-bold font-serif text-${t}`}>{v}</div>
            <div className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">{l}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">National Meals — Monthly Trend</h3>
              <Pill tone="emerald">{mon.length} months data</Pill>
            </div>
            {mon.length>0?(
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={mon}>
                  <defs><linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.4}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5"/>
                  <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                  <YAxis yAxisId="left"  tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}}/>
                  <Tooltip formatter={(v,n)=>[fmtNum(v),n==='meals'?'Meals':'Reports']}/>
                  <Legend/>
                  <Area  yAxisId="left"  type="monotone" dataKey="meals"   name="meals"   stroke="#15493B" fill="url(#execGrad)" strokeWidth={2.5}/>
                  <Bar   yAxisId="right" dataKey="reports" name="reports"  fill="#C9882C" radius={[2,2,0,0]} opacity={0.7}/>
                </ComposedChart>
              </ResponsiveContainer>
            ):<div className="h-60 flex items-center justify-center text-stone-300 text-sm">Submit reports to see trend data</div>}
          </Card>
        </div>
        <div className="space-y-4">
          {/* Budget */}
          <Card>
            <h3 className="font-semibold text-ink mb-3 text-sm flex items-center justify-between">Budget Utilisation <button onClick={()=>onNavigate&&onNavigate('natfinance')} className="text-xs text-forest hover:underline flex items-center gap-0.5">Details<ArrowUpRight className="w-3 h-3"/></button></h3>
            {nat.total>0?(
              <div className="space-y-2.5">
                {[['Allocated',nat.allocated,nat.total,'amber'],['Disbursed',nat.disbursed,nat.total,'emerald'],['Balance',nat.balance,nat.total,nat.balance<nat.total*0.1?'rust':'forest']].map(([l,v,max,t])=>(
                  <div key={l}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-stone-500">{l}</span><span className={`font-bold text-${t}`}>{cedis(v||0)}</span></div>
                    <div className="h-1.5 bg-stone-100 rounded-full"><div className={`h-full bg-${t} rounded-full`} style={{width:`${max>0?Math.min((v||0)/max*100,100):0}%`}}/></div>
                  </div>
                ))}
              </div>
            ):<p className="text-stone-300 text-sm text-center py-3">No budget configured</p>}
          </Card>
          {/* Ghana map */}
          <Card>
            <h3 className="font-semibold text-ink mb-2 text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-navy"/>Regional Heatmap</h3>
            <GhanaMap data={reg.map((r,i)=>({code:r.code,name:r.name,meals:Math.floor(40000+i*9000),schools:(r.district_count||0)*8,districts:r.district_count||0}))} metric="meals" onRegionClick={()=>onNavigate&&onNavigate('natanalytics')}/>
          </Card>
        </div>
      </div>

      {/* Disbursements + caterers + activity */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Pending disbursements */}
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber"/>Pending Approvals</span>
            <button onClick={()=>onNavigate&&onNavigate('disbursements')} className="text-xs text-forest hover:underline">View all</button>
          </h3>
          {pendingDisbs.length===0?(
            <div className="text-center py-6 text-stone-300"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">No pending disbursements</p></div>
          ):(
            <div className="space-y-2">
              {pendingDisbs.slice(0,4).map(d=>(
                <div key={d._id||d.id} className="p-3 bg-amber/5 border border-amber/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{d.recipient_name}</div>
                      <div className="text-xs text-stone-400">{d.reference} · {d.level}</div>
                    </div>
                    <div className="text-sm font-bold text-amber font-mono flex-shrink-0 ml-2">{cedis(d.amount)}</div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={()=>onNavigate&&onNavigate('disbursements')} className="flex-1 py-1 bg-emerald text-white text-xs rounded-lg font-semibold hover:bg-emerald/90">Approve</button>
                    <button onClick={()=>onNavigate&&onNavigate('disbursements')} className="flex-1 py-1 bg-rust/10 text-rust text-xs rounded-lg font-semibold hover:bg-rust/20">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top caterers */}
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber"/>Top Caterers Nationally</h3>
          {cat.length===0?<p className="text-stone-300 text-sm text-center py-6">No caterer data yet</p>:(
            <div className="space-y-2.5">
              {cat.slice(0,6).map((c,i)=>(
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{background:i===0?'#C9882C':i===1?'#9ca3af':i===2?'#a16207':'#f3f4f6',color:i<3?'white':'#374151'}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{c.name||'—'}</div>
                    <div className="text-xs text-stone-400">{fmtNum(c.approved||0)} approved</div>
                  </div>
                  <div className="text-sm font-bold font-mono text-forest">{fmtNum(c.meals||0)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Live activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink flex items-center gap-2"><Zap className="w-4 h-4 text-amber"/>Live Activity</h3>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse"/><span className="text-xs text-stone-400">Live</span></div>
          </div>
          {aud.length===0?<p className="text-stone-300 text-sm text-center py-6">No recent activity</p>:(
            <div className="space-y-0 max-h-56 overflow-y-auto">
              {aud.map((a,i)=>(
                <div key={i} className="py-2.5 border-b border-stone-50 last:border-0">
                  <div className="text-xs font-bold font-mono text-forest">{a.action}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{a.user_name} · {fmtDateTime(a.timestamp)}</div>
                  {a.details&&<div className="text-xs text-stone-400 truncate">{a.details}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Report status + regions */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-amber"/>Report Status</h3>
          {tot===0?<p className="text-stone-300 text-sm text-center py-6">No reports yet</p>:(
            <>
              {statusPie.length>0&&(
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart><Pie data={statusPie} cx="50%" cy="50%" outerRadius={50} innerRadius={25} dataKey="value">
                    {statusPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}
                  </Pie><Tooltip/></PieChart>
                </ResponsiveContainer>
              )}
              <div className="space-y-2.5 mt-2">
                {[['Approved',c.approved_reports||0,'emerald',CheckCircle2],['Pending',c.pending_reports||0,'amber',Clock],['Rejected',c.rejected_reports||0,'rust',AlertTriangle]].map(([l,v,t,Icon])=>{
                  const pct=tot>0?Math.round(v/tot*100):0;
                  return (
                    <div key={l}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-xs text-stone-600"><Icon className={`w-3 h-3 text-${t}`}/>{l}</span>
                        <span className={`text-xs font-bold text-${t}`}>{fmtNum(v)} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full"><div className={`h-full bg-${t} rounded-full`} style={{width:`${pct}%`}}/></div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-navy"/>Regions ({reg.length}/16)</h3>
          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
            {reg.map((r,i)=>(
              <div key={r._id||r.id} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                <span className="text-xs font-medium text-ink truncate">{r.name}</span>
                <span className="text-[10px] text-stone-400 ml-1 flex-shrink-0">{r.district_count||0}d</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick access */}
      <Card>
        <h3 className="font-semibold text-ink mb-4">Executive Quick Access</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {[
            {label:'Analytics',      view:'natanalytics',  icon:BarChart3,   color:'#1E3A5F'},
            {label:'Reports Hub',    view:'natreports',    icon:FileText,    color:'#C0392B'},
            {label:'Finance',        view:'natfinance',    icon:DollarSign,  color:'#C9882C'},
            {label:'Disbursements',  view:'disbursements', icon:CreditCard,  color:'#C9882C'},
            {label:'All Regions',    view:'regions',       icon:Globe,       color:'#15493B'},
            {label:'Districts',      view:'districts',     icon:MapPin,      color:'#059669'},
            {label:'User Mgmt',      view:'users',         icon:Users,       color:'#7C3AED'},
            {label:'Audit Trail',    view:'audit',         icon:ShieldCheck, color:'#374151'},
            {label:'AI Agents',      view:'agents',        icon:Activity,    color:'#0E7490'},
            {label:'Official Reports',view:'official-reports',icon:FileText, color:'#065F46'},
            {label:'Chatbot Mgr',    view:'chatbot-admin', icon:Zap,         color:'#92400E'},
            {label:'Sys Config',     view:'sysconfig',     icon:ShieldCheck, color:'#1F2937'},
          ].map(item=>(
            <button key={item.view} onClick={()=>onNavigate&&onNavigate(item.view)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-stone-100 hover:shadow-md hover:border-stone-200 transition-all group bg-white">
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
