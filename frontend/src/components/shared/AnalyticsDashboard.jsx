import { useEffect, useState, useCallback } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Target, Award, AlertTriangle, CheckCircle2, RefreshCw, ChevronRight, ChevronLeft, Download, Zap, Star, Users, School, MapPin, Globe } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Card from '../ui/Card';
import KPI from '../ui/KPI';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import Modal from '../ui/Modal';
import { fmtNum, fmtDate, cedis, ROLE_LABELS, ROLE_TIER } from '../../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { exportPDF } from '../../utils/export';

/* ─── helpers ────────────────────────────────────────────────── */
const grade = (rate) => rate >= 90 ? { label:'Excellent', color:'#059669', emoji:'🏆', tone:'emerald' }
  : rate >= 75 ? { label:'Good',       color:'#15493B', emoji:'🥇', tone:'forest'  }
  : rate >= 60 ? { label:'Average',    color:'#C9882C', emoji:'🥈', tone:'amber'   }
  : rate >= 40 ? { label:'Below Avg',  color:'#C0532B', emoji:'⚠️', tone:'rust'    }
  :              { label:'Poor',       color:'#C0392B', emoji:'🔴', tone:'rust'     };

const trend = (current, previous) => {
  if (!previous) return { dir:'neutral', pct:0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral', pct: Math.abs(pct) };
};

function TrendBadge({ current, previous }) {
  const { dir, pct } = trend(current, previous);
  if (dir === 'neutral') return <span className="text-xs text-stone-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${dir === 'up' ? 'text-emerald' : 'text-rust'}`}>
      {dir === 'up' ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
      {pct}%
    </span>
  );
}

function InsightCard({ title, items, tone = 'stone' }) {
  const colors = { emerald:'bg-emerald/5 border-emerald/20 text-emerald', rust:'bg-rust/5 border-rust/20 text-rust', amber:'bg-amber/5 border-amber/20 text-amber', navy:'bg-navy/5 border-navy/20 text-navy', stone:'bg-stone-50 border-stone-200 text-stone-600' };
  return (
    <div className={`rounded-xl border p-4 ${colors[tone]}`}>
      <div className="font-semibold text-sm mb-2">{title}</div>
      <ul className="space-y-1">
        {items.map((item,i) => <li key={i} className="text-xs leading-relaxed">• {item}</li>)}
      </ul>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DISTRICT ANALYTICS — Inter-school + caterer performance
══════════════════════════════════════════════════════════════ */
function DistrictAnalytics() {
  const [schools,  setSch]  = useState([]);
  const [reports,  setRep]  = useState([]);
  const [payments, setPay]  = useState([]);
  const [monthly,  setMon]  = useState([]);
  const [caterers, setCat]  = useState([]);
  const [selSch,   setSel]  = useState(null);
  const [tab,      setTab]  = useState('schools');
  const [ts,       setTs]   = useState(null);

  const load = useCallback(async () => {
    const [s,r,p,m,c] = await Promise.allSettled([
      api.schools.list(), api.reports.list({limit:500}),
      api.payments.list(), api.analytics.monthly(), api.analytics.caterers(),
    ]);
    if(s.status==='fulfilled') setSch(s.value?.schools||[]);
    if(r.status==='fulfilled') setRep(r.value?.reports||[]);
    if(p.status==='fulfilled') setPay(p.value?.payments||[]);
    if(m.status==='fulfilled') setMon(m.value?.monthly||[]);
    if(c.status==='fulfilled') setCat(c.value?.caterers||[]);
    setTs(new Date().toLocaleTimeString('en-GH'));
  },[]);
  useEffect(()=>{ load(); },[load]);

  // Per-school metrics
  const schoolMetrics = schools.map(s => {
    const sr    = reports.filter(r => r.school_id === (s._id||s.id));
    const appr  = sr.filter(r => r.status==='approved');
    const rate  = sr.length > 0 ? Math.round(appr.length/sr.length*100) : 0;
    const meals = appr.reduce((t,r) => t+r.students_fed, 0);
    const pay   = payments.find(p => p.school_id === (s._id||s.id));
    const arrears = pay?.arrears_amount || 0;
    const today = new Date().toISOString().split('T')[0];
    const reportedToday = sr.some(r => r.date===today && r.status!=='rejected');
    const g = grade(rate);
    return { ...s, reports:sr.length, approved:appr.length, rate, meals, arrears, reportedToday, grade:g, caterer_name: s.caterer?.name||'—' };
  }).sort((a,b) => b.rate - a.rate);

  // Caterer metrics
  const catererMetrics = caterers.map((c,i) => {
    const rate = c.approved+c.pending > 0 ? Math.round(c.approved/(c.approved+c.pending)*100) : 0;
    const pay  = payments.find(p => p.caterer?.name===c.name);
    return { ...c, rate, arrears:pay?.arrears_amount||0, grade:grade(rate), rank:i+1 };
  }).sort((a,b) => b.rate - a.rate);

  const today         = new Date().toISOString().split('T')[0];
  const avgRate       = schoolMetrics.length > 0 ? Math.round(schoolMetrics.reduce((s,m)=>s+m.rate,0)/schoolMetrics.length) : 0;
  const totalMeals    = schoolMetrics.reduce((s,m)=>s+m.meals,0);
  const reportedToday = schoolMetrics.filter(s=>s.reportedToday).length;
  const topSchool     = schoolMetrics[0];
  const weakSchool    = [...schoolMetrics].sort((a,b)=>a.rate-b.rate)[0];

  // Strengths, weaknesses, recommendations
  const strengths = [
    avgRate >= 80 && `Overall compliance at ${avgRate}% — above the 80% target`,
    reportedToday === schools.length && 'All schools reported today — 100% daily coverage',
    topSchool && `${topSchool.name} leads with ${topSchool.rate}% compliance`,
    catererMetrics.filter(c=>c.rate>=90).length > 0 && `${catererMetrics.filter(c=>c.rate>=90).length} caterer(s) achieving Excellent (90%+)`,
  ].filter(Boolean);

  const weaknesses = [
    avgRate < 80 && `District average ${avgRate}% is below the 80% national target`,
    reportedToday < schools.length && `${schools.length-reportedToday} school(s) did not report today`,
    weakSchool && weakSchool.rate < 60 && `${weakSchool.name} critically low at ${weakSchool.rate}%`,
    catererMetrics.filter(c=>c.arrears>0).length > 0 && `${catererMetrics.filter(c=>c.arrears>0).length} caterer(s) have payment arrears`,
  ].filter(Boolean);

  const recommendations = [
    avgRate < 80 && 'Conduct field visits to bottom 3 schools within 2 weeks',
    reportedToday < schools.length && 'Send automated reminders at 9am daily to non-reporting caterers',
    weakSchool && weakSchool.rate < 60 && `Prioritise performance improvement plan for ${weakSchool.name}`,
    catererMetrics.filter(c=>c.arrears>0).length > 0 && 'Escalate payment arrears to District Finance Officer for immediate resolution',
    catererMetrics.some(c=>c.rate>=95) && 'Recognise top-performing caterers at next district meeting',
  ].filter(Boolean);

  const barData = schoolMetrics.map(s => ({ name:s.name.split(' ').slice(0,2).join(' '), rate:s.rate, meals:s.meals }));

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#15493B 0%,#0f3329 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-emerald/70"/><span className="text-[10px] font-bold tracking-widest text-emerald/60 uppercase">District Analytics — Inter-School</span></div>
            <h1 className="font-serif text-2xl font-bold text-white">District Performance Analysis</h1>
            <p className="text-white/50 text-sm mt-1">School vs school · Caterer performance · Strengths & recommendations</p>
          </div>
          <div className="flex gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Schools"          value={fmtNum(schools.length)}     icon={School}       tone="forest"/>
        <KPI label="District Average" value={`${avgRate}%`}              icon={Target}       tone={avgRate>=80?'emerald':avgRate>=60?'amber':'rust'}/>
        <KPI label="Reported Today"   value={`${reportedToday}/${schools.length}`} icon={CheckCircle2} tone={reportedToday===schools.length?'emerald':'amber'}/>
        <KPI label="Total Meals"      value={fmtNum(totalMeals)}         icon={TrendingUp}   tone="navy"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['schools','School Rankings'],['caterers','Caterer Performance'],['trend','Trend Analysis'],['insights','Insights & Recommendations']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#15493B] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {/* SCHOOL RANKINGS */}
      {tab==='schools'&&(
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-ink mb-4">School Compliance Comparison</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis type="number" domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={100}/>
                <Tooltip formatter={v=>[`${v}%`,'Compliance']}/>
                <Bar dataKey="rate" radius={[0,4,4,0]}>
                  {barData.map((d,i)=><Cell key={i} fill={d.rate>=90?'#059669':d.rate>=75?'#15493B':d.rate>=60?'#C9882C':'#C0392B'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card noPadding>
            <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">School-by-School Breakdown</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-center px-4 py-3">Rank</th><th className="text-left px-4 py-3">School</th><th className="text-right px-4 py-3">Enrolled</th><th className="text-right px-4 py-3">Reports</th><th className="text-right px-4 py-3">Approved</th><th className="text-right px-4 py-3">Meals</th><th className="text-center px-4 py-3">Compliance</th><th className="text-center px-4 py-3">Grade</th><th className="text-center px-4 py-3">Today</th><th className="px-4 py-3"/></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {schoolMetrics.map((s,i)=>(
                    <tr key={s._id||s.id} className={`hover:bg-paper cursor-pointer ${s.rate<60?'bg-rust/5':''}`} onClick={()=>setSel(s)}>
                      <td className="px-4 py-3 text-center">{i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                      <td className="px-4 py-3"><div className="font-semibold text-ink">{s.name}</div><div className="text-xs text-stone-400">{s.town}</div></td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.enrolled)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(s.reports)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(s.approved)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-forest font-bold">{fmtNum(s.meals)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-1.5 bg-stone-100 rounded-full"><div className="h-full rounded-full" style={{width:`${s.rate}%`,backgroundColor:s.grade.color}}/></div>
                          <span className="text-xs font-bold" style={{color:s.grade.color}}>{s.rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center"><span className="text-sm">{s.grade.emoji}</span> <span className="text-xs" style={{color:s.grade.color}}>{s.grade.label}</span></td>
                      <td className="px-4 py-3 text-center">{s.reportedToday?<span className="text-emerald font-bold text-xs">✓</span>:<span className="text-rust font-bold text-xs">✗</span>}</td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-stone-300"/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CATERER PERFORMANCE */}
      {tab==='caterers'&&(
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold text-ink mb-4">Caterer Compliance Ranking</h3>
              <div className="space-y-3">
                {catererMetrics.map((c,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{background:i===0?'#C9882C':i===1?'#9ca3af':i===2?'#a16207':'#f3f4f6',color:i<3?'white':'#374151'}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-0.5"><span className="font-medium text-ink truncate">{c.name||'—'}</span><span className="font-bold" style={{color:c.grade.color}}>{c.rate}%</span></div>
                      <div className="h-2 bg-stone-100 rounded-full"><div className="h-full rounded-full" style={{width:`${c.rate}%`,backgroundColor:c.grade.color}}/></div>
                      <div className="flex justify-between mt-0.5 text-xs text-stone-400"><span>{fmtNum(c.meals||0)} meals</span><span>{c.grade.emoji} {c.grade.label}</span></div>
                    </div>
                  </div>
                ))}
                {catererMetrics.length===0&&<p className="text-stone-300 text-sm text-center py-4">No caterer data</p>}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-ink mb-4">Payment Status</h3>
              <div className="space-y-3">
                {catererMetrics.map((c,i)=>(
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${c.arrears>0?'border-rust/20 bg-rust/5':'border-emerald/20 bg-emerald/5'}`}>
                    <div><div className="text-sm font-medium text-ink">{c.name||'—'}</div><div className="text-xs text-stone-400">{c.arrears>0?`${cedis(c.arrears)} arrears`:'Fully paid'}</div></div>
                    <Pill tone={c.arrears>0?'rust':'emerald'}>{c.arrears>0?'Arrears':'Paid'}</Pill>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TREND */}
      {tab==='trend'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">Monthly Feeding Trend — All Schools</h3>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthly}>
                <defs><linearGradient id="distAGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Area type="monotone" dataKey="meals" stroke="#15493B" fill="url(#distAGrad)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          ):<p className="text-stone-300 text-sm text-center py-16">No trend data yet</p>}
        </Card>
      )}

      {/* INSIGHTS */}
      {tab==='insights'&&(
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {strengths.length>0&&<InsightCard title="💪 Strengths" items={strengths} tone="emerald"/>}
            {weaknesses.length>0&&<InsightCard title="⚠️ Weaknesses" items={weaknesses} tone="rust"/>}
            {recommendations.length>0&&<InsightCard title="💡 Recommendations" items={recommendations} tone="amber"/>}
          </div>
          {/* Radar scorecard */}
          <Card>
            <h3 className="font-semibold text-ink mb-4">District Performance Scorecard</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={[
                  { subject:'Compliance', value:avgRate },
                  { subject:'Daily Coverage', value:schools.length>0?Math.round(reportedToday/schools.length*100):0 },
                  { subject:'Meals Volume', value:Math.min(100,Math.round(totalMeals/Math.max(1,schools.length*500)*100)) },
                  { subject:'Payment', value:Math.round(payments.filter(p=>p.days_arrears===0).length/Math.max(1,payments.length)*100) },
                  { subject:'Caterer Quality', value:catererMetrics.length>0?Math.round(catererMetrics.reduce((s,c)=>s+c.rate,0)/catererMetrics.length):0 },
                ]}>
                  <PolarGrid/>
                  <PolarAngleAxis dataKey="subject" tick={{fontSize:11}}/>
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fontSize:9}}/>
                  <Radar dataKey="value" stroke="#15493B" fill="#15493B" fillOpacity={0.25} strokeWidth={2}/>
                  <Tooltip formatter={v=>[`${v}%`,'Score']}/>
                </RadarChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {[
                  ['Compliance Rate',`${avgRate}%`,avgRate>=80],
                  ['Daily Coverage',`${reportedToday}/${schools.length} schools`,reportedToday===schools.length],
                  ['Total Meals Served',fmtNum(totalMeals),totalMeals>0],
                  ['Schools Paid Up',`${payments.filter(p=>p.days_arrears===0).length}/${payments.length}`,payments.every(p=>p.days_arrears===0)],
                  ['Top Caterer',catererMetrics[0]?.name||'—',catererMetrics[0]?.rate>=90],
                ].map(([l,v,good])=>(
                  <div key={l} className={`flex items-center justify-between p-3 rounded-xl border ${good?'border-emerald/20 bg-emerald/5':'border-amber/20 bg-amber/5'}`}>
                    <span className="text-sm text-stone-600">{l}</span>
                    <div className="flex items-center gap-2"><span className="font-bold text-ink text-sm">{v}</span><span>{good?'✅':'⚠️'}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* School detail modal */}
      <Modal open={!!selSch} onClose={()=>setSel(null)} title={selSch?.name||''} size="md">
        {selSch&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['Town',selSch.town],['Enrolled',fmtNum(selSch.enrolled)],['Reports',fmtNum(selSch.reports)],['Approved',fmtNum(selSch.approved)],['Compliance',`${selSch.rate}%`],['Total Meals',fmtNum(selSch.meals)],['Payment Arrears',cedis(selSch.arrears)],['Grade',selSch.grade?.label]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v||'—'}</div></div>
              ))}
            </div>
            <div className={`p-4 rounded-xl border-2 ${selSch.rate>=80?'border-emerald/30 bg-emerald/5':selSch.rate>=60?'border-amber/30 bg-amber/5':'border-rust/30 bg-rust/5'}`}>
              <div className="text-2xl font-bold font-serif" style={{color:selSch.grade?.color}}>{selSch.grade?.emoji} {selSch.rate}% — {selSch.grade?.label}</div>
              {selSch.rate<60&&<p className="text-sm text-rust mt-1">⚠ This school needs immediate attention. Consider scheduling a field visit.</p>}
              {selSch.rate>=90&&<p className="text-sm text-emerald mt-1">🏆 Outstanding performer — consider sharing best practices district-wide.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REGIONAL ANALYTICS — Inter-district performance
══════════════════════════════════════════════════════════════ */
function RegionalAnalytics() {
  const [overview, setOv]  = useState(null);
  const [monthly,  setMon] = useState([]);
  const [caterers, setCat] = useState([]);
  const [payments, setPay] = useState([]);
  const [schools,  setSch] = useState([]);
  const [reports,  setRep] = useState([]);
  const [selDist,  setSel] = useState(null);
  const [tab,      setTab] = useState('districts');
  const [ts,       setTs]  = useState(null);

  const load = useCallback(async()=>{
    const [ov,m,c,p,s,r] = await Promise.allSettled([
      api.analytics.overview(), api.analytics.monthly(),
      api.analytics.caterers(), api.payments.list(),
      api.schools.list(), api.reports.list({limit:500}),
    ]);
    if(ov.status==='fulfilled') setOv(ov.value?.counters||{});
    if(m.status==='fulfilled')  setMon(m.value?.monthly||[]);
    if(c.status==='fulfilled')  setCat(c.value?.caterers||[]);
    if(p.status==='fulfilled')  setPay(p.value?.payments||[]);
    if(s.status==='fulfilled')  setSch(s.value?.schools||[]);
    if(r.status==='fulfilled')  setRep(r.value?.reports||[]);
    setTs(new Date().toLocaleTimeString('en-GH'));
  },[]);
  useEffect(()=>{ load(); },[load]);

  // Group schools by district to simulate inter-district view
  const districtMap = {};
  schools.forEach(s=>{
    const key = s.district_id || 'unknown';
    if (!districtMap[key]) districtMap[key] = { id:key, name:s.district_name||`District ${key.slice(-4)}`, schools:[], reports:[], payments:[] };
    districtMap[key].schools.push(s);
  });
  reports.forEach(r=>{ if(districtMap[r.district_id]) districtMap[r.district_id].reports.push(r); });
  payments.forEach(p=>{ if(districtMap[p.district_id]) districtMap[p.district_id].payments.push(p); });

  const districtMetrics = Object.values(districtMap).map(d=>{
    const appr = d.reports.filter(r=>r.status==='approved').length;
    const rate  = d.reports.length > 0 ? Math.round(appr/d.reports.length*100) : 0;
    const meals = d.reports.filter(r=>r.status==='approved').reduce((s,r)=>s+r.students_fed,0);
    const arrears = d.payments.reduce((s,p)=>s+(p.arrears_amount||0),0);
    const g = grade(rate);
    return { ...d, approved:appr, rate, meals, arrears, schoolCount:d.schools.length, grade:g };
  }).sort((a,b)=>b.rate-a.rate);

  const c = overview||{};
  const totReports = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const compRate   = totReports>0?Math.round((c.approved_reports||0)/totReports*100):0;
  const totalMeals = districtMetrics.reduce((s,d)=>s+d.meals,0);
  const totalArr   = districtMetrics.reduce((s,d)=>s+d.arrears,0);
  const topDistrict  = districtMetrics[0];
  const weakDistrict = [...districtMetrics].sort((a,b)=>a.rate-b.rate)[0];

  const strengths = [
    compRate>=80&&`Regional compliance at ${compRate}% — meets national target`,
    topDistrict&&`${topDistrict.name} leads with ${topDistrict.rate}% compliance`,
    districtMetrics.filter(d=>d.rate>=80).length>0&&`${districtMetrics.filter(d=>d.rate>=80).length} district(s) performing above target`,
  ].filter(Boolean);
  const weaknesses = [
    compRate<80&&`Regional average ${compRate}% below 80% national target`,
    weakDistrict&&weakDistrict.rate<60&&`${weakDistrict.name} critically underperforming at ${weakDistrict.rate}%`,
    totalArr>0&&`Total regional arrears: ${cedis(totalArr)}`,
  ].filter(Boolean);
  const recommendations = [
    weakDistrict&&weakDistrict.rate<60&&`Regional coordinator visit ${weakDistrict.name} for immediate support`,
    totalArr>0&&`Escalate arrears to Regional Finance Officer for payment follow-up`,
    compRate<80&&`District Directors below target must submit improvement plans within 2 weeks`,
    topDistrict&&`Share ${topDistrict.name} best practices across all districts`,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#3b0764 0%,#1e0336 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-purple-300/70"/><span className="text-[10px] font-bold tracking-widest text-purple-300/50 uppercase">Regional Analytics — Inter-District</span></div>
            <h1 className="font-serif text-2xl font-bold text-white">Regional Performance Analysis</h1>
            <p className="text-white/50 text-sm mt-1">District vs district · Click any district for details</p>
          </div>
          <div className="flex gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Districts"      value={fmtNum(districtMetrics.length)} icon={MapPin}     tone="navy"/>
        <KPI label="Regional Avg"  value={`${compRate}%`}                  icon={Target}     tone={compRate>=80?'emerald':compRate>=60?'amber':'rust'}/>
        <KPI label="Total Schools" value={fmtNum(schools.length)}          icon={School}     tone="forest"/>
        <KPI label="Total Meals"   value={fmtNum(totalMeals)}              icon={TrendingUp} tone="emerald"/>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['districts','District Rankings'],['caterers','Caterer Overview'],['trend','Regional Trend'],['insights','Insights & Recommendations']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#3b0764] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {tab==='districts'&&(
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-ink mb-4">District Compliance Comparison — Click to drill down</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={districtMetrics.map(d=>({name:d.name.split(' ').slice(0,2).join(' '),rate:d.rate,meals:d.meals}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:9}}/>
                <YAxis domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`}/>
                <Tooltip formatter={(v,n)=>[n==='rate'?`${v}%`:fmtNum(v),n==='rate'?'Compliance':'Meals']}/>
                <Bar dataKey="rate" radius={[4,4,0,0]} cursor="pointer" onClick={(d)=>setSel(districtMetrics.find(m=>m.name.startsWith(d.name.split(' ')[0])))}>
                  {districtMetrics.map((d,i)=><Cell key={i} fill={d.grade.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-stone-400 text-center mt-2">Click on a bar to see district details</p>
          </Card>

          <Card noPadding>
            <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">District Performance Table</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-center px-4 py-3">Rank</th><th className="text-left px-4 py-3">District</th><th className="text-right px-4 py-3">Schools</th><th className="text-right px-4 py-3">Reports</th><th className="text-right px-4 py-3">Meals</th><th className="text-right px-4 py-3">Arrears</th><th className="text-center px-4 py-3">Compliance</th><th className="text-center px-4 py-3">Grade</th><th className="px-4 py-3"/></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {districtMetrics.map((d,i)=>(
                    <tr key={d.id} className="hover:bg-paper cursor-pointer" onClick={()=>setSel(d)}>
                      <td className="px-4 py-3 text-center">{i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{d.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(d.schoolCount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(d.reports.length)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-forest font-bold">{fmtNum(d.meals)}</td>
                      <td className={`px-4 py-3 text-right font-mono text-xs ${d.arrears>0?'text-rust font-bold':''}`}>{d.arrears>0?cedis(d.arrears):'✓'}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2 justify-center"><div className="w-16 h-1.5 bg-stone-100 rounded-full"><div className="h-full rounded-full" style={{width:`${d.rate}%`,backgroundColor:d.grade.color}}/></div><span className="text-xs font-bold" style={{color:d.grade.color}}>{d.rate}%</span></div></td>
                      <td className="px-4 py-3 text-center text-sm">{d.grade.emoji}</td>
                      <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-stone-300"/></td>
                    </tr>
                  ))}
                  {districtMetrics.length===0&&<tr><td colSpan={9} className="px-4 py-8 text-center text-stone-300 text-sm">No district data available</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab==='caterers'&&(
        <Card noPadding>
          <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">Caterer Performance — Regional Overview</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="text-center px-4 py-3">#</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Approved</th><th className="text-right px-4 py-3">Pending</th><th className="text-right px-4 py-3">Meals</th><th className="text-center px-4 py-3">Compliance</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {caterers.sort((a,b)=>b.approved-a.approved).map((c,i)=>{
                  const rate = c.approved+c.pending>0?Math.round(c.approved/(c.approved+c.pending)*100):0;
                  const g = grade(rate);
                  return (
                    <tr key={i} className="hover:bg-paper">
                      <td className="px-4 py-3 text-center">{i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                      <td className="px-4 py-3 font-medium text-ink">{c.name||'—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(c.approved||0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-amber">{fmtNum(c.pending||0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-forest">{fmtNum(c.meals||0)}</td>
                      <td className="px-4 py-3 text-center"><Pill tone={g.tone}>{rate}%</Pill></td>
                    </tr>
                  );
                })}
                {caterers.length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-stone-300 text-sm">No caterer data</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab==='trend'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">Regional Monthly Trend</h3>
          {monthly.length>0?(
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthly}>
                <defs><linearGradient id="regAGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7e22ce" stopOpacity={0.3}/><stop offset="95%" stopColor="#7e22ce" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                <Area type="monotone" dataKey="meals" stroke="#7e22ce" fill="url(#regAGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ):<p className="text-stone-300 text-sm text-center py-16">No trend data</p>}
        </Card>
      )}

      {tab==='insights'&&(
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {strengths.length>0&&<InsightCard title="💪 Regional Strengths" items={strengths} tone="emerald"/>}
            {weaknesses.length>0&&<InsightCard title="⚠️ Regional Weaknesses" items={weaknesses} tone="rust"/>}
            {recommendations.length>0&&<InsightCard title="💡 Recommendations" items={recommendations} tone="amber"/>}
          </div>
          <Card>
            <h3 className="font-semibold text-ink mb-4">District Comparison — Scorecard</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {districtMetrics.map((d,i)=>(
                <div key={d.id} className={`p-4 rounded-xl border-2 cursor-pointer hover:shadow-sm transition-all ${d.rate>=80?'border-emerald/30':d.rate>=60?'border-amber/30':'border-rust/30'}`} onClick={()=>setSel(d)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-ink">{d.name}</div>
                    <div className="flex items-center gap-1.5"><span className="text-xl">{d.grade.emoji}</span><Pill tone={d.grade.tone}>{d.rate}%</Pill></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-stone-500">
                    <div><div className="font-bold text-ink">{fmtNum(d.schoolCount)}</div>Schools</div>
                    <div><div className="font-bold text-forest">{fmtNum(d.meals)}</div>Meals</div>
                    <div><div className={`font-bold ${d.arrears>0?'text-rust':'text-emerald'}`}>{d.arrears>0?cedis(d.arrears):'✓ Paid'}</div>Payment</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* District detail modal */}
      <Modal open={!!selDist} onClose={()=>setSel(null)} title={`${selDist?.name} — District Details`} size="md">
        {selDist&&(
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 text-center ${selDist.rate>=80?'border-emerald/30 bg-emerald/5':'border-amber/30 bg-amber/5'}`}>
              <div className="text-4xl mb-1">{selDist.grade?.emoji}</div>
              <div className="text-3xl font-bold font-serif" style={{color:selDist.grade?.color}}>{selDist.rate}%</div>
              <div className="text-sm text-stone-500">{selDist.grade?.label} — {selDist.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Schools',fmtNum(selDist.schoolCount)],['Total Reports',fmtNum(selDist.reports?.length||0)],['Approved',fmtNum(selDist.approved)],['Total Meals',fmtNum(selDist.meals)],['Compliance',`${selDist.rate}%`],['Arrears',selDist.arrears>0?cedis(selDist.arrears):'None']].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v}</div></div>
              ))}
            </div>
            {selDist.rate<60&&<InsightCard title="⚠️ Action Required" items={[`Compliance at ${selDist.rate}% is critically below target`,`Schedule field visits to all ${selDist.schoolCount} schools`,`Submit improvement plan to Regional Coordinator within 1 week`]} tone="rust"/>}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   NATIONAL ANALYTICS — Inter-region performance
══════════════════════════════════════════════════════════════ */
function NationalAnalytics() {
  const [overview, setOv]  = useState(null);
  const [monthly,  setMon] = useState([]);
  const [caterers, setCat] = useState([]);
  const [schools,  setSch] = useState([]);
  const [reports,  setRep] = useState([]);
  const [selReg,   setSel] = useState(null);
  const [tab,      setTab] = useState('regions');
  const [ts,       setTs]  = useState(null);

  const GHANA_REGIONS = ['Greater Accra','Ashanti','Western','Western North','Eastern','Central','Volta','Oti','Northern','Savannah','North East','Upper East','Upper West','Bono','Bono East','Ahafo'];

  const load = useCallback(async()=>{
    const [ov,m,c,s,r] = await Promise.allSettled([
      api.analytics.overview(), api.analytics.monthly(),
      api.analytics.caterers(), api.schools.list(), api.reports.list({limit:500}),
    ]);
    if(ov.status==='fulfilled') setOv(ov.value?.counters||{});
    if(m.status==='fulfilled')  setMon(m.value?.monthly||[]);
    if(c.status==='fulfilled')  setCat(c.value?.caterers||[]);
    if(s.status==='fulfilled')  setSch(s.value?.schools||[]);
    if(r.status==='fulfilled')  setRep(r.value?.reports||[]);
    setTs(new Date().toLocaleTimeString('en-GH'));
  },[]);
  useEffect(()=>{ load(); },[load]);

  const c = overview||{};
  const totReports = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const natCompRate = totReports>0?Math.round((c.approved_reports||0)/totReports*100):0;
  const totalMeals  = monthly.reduce((s,m)=>s+m.meals,0);

  // Simulate region data from schools
  const regionMap = {};
  schools.forEach(s=>{
    const rname = s.region_name || 'Unknown Region';
    if (!regionMap[rname]) regionMap[rname] = { name:rname, schools:[], reports:[] };
    regionMap[rname].schools.push(s);
  });
  reports.forEach(r=>{ const rname=r.region_name||'Unknown Region'; if(regionMap[rname]) regionMap[rname].reports.push(r); });

  // For all 16 regions show coverage
  const regionMetrics = GHANA_REGIONS.map(rname=>{
    const data = regionMap[rname] || { name:rname, schools:[], reports:[] };
    const appr = data.reports.filter(r=>r.status==='approved').length;
    const rate  = data.reports.length > 0 ? Math.round(appr/data.reports.length*100) : 0;
    const meals = data.reports.filter(r=>r.status==='approved').reduce((s,r)=>s+r.students_fed,0);
    const covered = data.schools.length > 0;
    const g = covered ? grade(rate) : { label:'Not Covered', color:'#9ca3af', emoji:'⚫', tone:'stone' };
    return { name:rname, ...data, approved:appr, rate, meals, schoolCount:data.schools.length, covered, grade:g };
  }).sort((a,b)=>b.rate-a.rate);

  const coveredRegions = regionMetrics.filter(r=>r.covered);
  const avgRate = coveredRegions.length>0?Math.round(coveredRegions.reduce((s,r)=>s+r.rate,0)/coveredRegions.length):0;
  const topRegion  = coveredRegions[0];
  const weakRegion = [...coveredRegions].sort((a,b)=>a.rate-b.rate)[0];

  const strengths = [
    natCompRate>=80&&`National compliance at ${natCompRate}% — meets 80% target`,
    topRegion&&`${topRegion.name} leads nationally with ${topRegion.rate}% compliance`,
    coveredRegions.filter(r=>r.rate>=80).length>0&&`${coveredRegions.filter(r=>r.rate>=80).length}/16 regions performing above target`,
  ].filter(Boolean);
  const weaknesses = [
    natCompRate<80&&`National average ${natCompRate}% below 80% target — urgent action needed`,
    16-coveredRegions.length>0&&`${16-coveredRegions.length} region(s) not yet covered by the programme`,
    weakRegion&&weakRegion.rate<60&&`${weakRegion.name} critically underperforming at ${weakRegion.rate}%`,
  ].filter(Boolean);
  const recommendations = [
    natCompRate<80&&`National Director to issue circular requiring improvement plans from all regions below 80%`,
    weakRegion&&`CEO to prioritise ${weakRegion.name} — schedule national review within 30 days`,
    16-coveredRegions.length>0&&`Develop expansion strategy to reach all 16 regions by next academic year`,
    topRegion&&`Share ${topRegion.name} model with all Regional Coordinators as best practice`,
    `Quarterly national performance review meetings recommended for all Regional Ministers`,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5" style={{background:'linear-gradient(135deg,#0d1117 0%,#1F2937 100%)'}}>
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 2px 2px,white 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-amber/70"/><span className="text-[10px] font-bold tracking-widest text-amber/50 uppercase">National Analytics — Inter-Region</span></div>
            <h1 className="font-serif text-2xl font-bold text-white">National Performance Analysis</h1>
            <p className="text-white/50 text-sm mt-1">All 16 regions · Click any region to drill down</p>
          </div>
          <div className="flex gap-2">
            {ts&&<span className="text-xs text-white/20">{ts}</span>}
            <Button icon={RefreshCw} variant="secondary" size="sm" onClick={load}>Refresh</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="National Avg"  value={`${natCompRate}%`}           icon={Target}     tone={natCompRate>=80?'emerald':natCompRate>=60?'amber':'rust'}/>
        <KPI label="Regions Active" value={`${coveredRegions.length}/16`} icon={MapPin}     tone={coveredRegions.length===16?'emerald':'amber'}/>
        <KPI label="Total Schools" value={fmtNum(schools.length)}      icon={School}     tone="forest"/>
        <KPI label="Total Meals"   value={fmtNum(totalMeals)}          icon={TrendingUp} tone="navy"/>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['regions','Region Rankings'],['map','16 Regions View'],['trend','National Trend'],['insights','National Insights']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-[#1F2937] text-white':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{l}</button>
        ))}
      </div>

      {tab==='regions'&&(
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-ink mb-4">Region Compliance Ranking — Click for details</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regionMetrics.filter(r=>r.covered).map(r=>({name:r.name.split(' ')[0],rate:r.rate,meals:r.meals}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:9}}/>
                <YAxis domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`}/>
                <Tooltip formatter={(v,n)=>[n==='rate'?`${v}%`:fmtNum(v),n==='rate'?'Compliance':'Meals']}/>
                <Bar dataKey="rate" radius={[4,4,0,0]} cursor="pointer" onClick={(d)=>setSel(regionMetrics.find(r=>r.name.startsWith(d.name)))}>
                  {regionMetrics.filter(r=>r.covered).map((r,i)=><Cell key={i} fill={r.grade.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card noPadding>
            <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-ink">All Regions Performance</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-center px-4 py-3">Rank</th><th className="text-left px-4 py-3">Region</th><th className="text-right px-4 py-3">Schools</th><th className="text-right px-4 py-3">Meals</th><th className="text-center px-4 py-3">Compliance</th><th className="text-center px-4 py-3">Grade</th><th className="px-4 py-3"/></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {regionMetrics.map((r,i)=>(
                    <tr key={r.name} className={`hover:bg-paper cursor-pointer ${!r.covered?'opacity-40':''}`} onClick={()=>r.covered&&setSel(r)}>
                      <td className="px-4 py-3 text-center">{!r.covered?'—':i<3?['🥇','🥈','🥉'][i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{r.covered?fmtNum(r.schoolCount):'—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-forest">{r.covered?fmtNum(r.meals):'—'}</td>
                      <td className="px-4 py-3">
                        {r.covered?<div className="flex items-center gap-2 justify-center"><div className="w-16 h-1.5 bg-stone-100 rounded-full"><div className="h-full rounded-full" style={{width:`${r.rate}%`,backgroundColor:r.grade.color}}/></div><span className="text-xs font-bold" style={{color:r.grade.color}}>{r.rate}%</span></div>
                        :<span className="text-xs text-stone-400">Not covered</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">{r.grade.emoji}</td>
                      <td className="px-4 py-3">{r.covered&&<ChevronRight className="w-4 h-4 text-stone-300"/>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab==='map'&&(
        <Card>
          <h3 className="font-semibold text-ink mb-4">All 16 Regions — Programme Coverage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {regionMetrics.map(r=>(
              <div key={r.name} onClick={()=>r.covered&&setSel(r)}
                className={`p-3 rounded-xl border-2 transition-all ${r.covered?'cursor-pointer hover:scale-[1.02]':'opacity-50'} ${r.covered&&r.rate>=80?'border-emerald/30 bg-emerald/5':r.covered&&r.rate>=60?'border-amber/30 bg-amber/5':r.covered?'border-rust/30 bg-rust/5':'border-stone-200 bg-stone-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-ink">{r.name}</span>
                  <span className="text-lg">{r.grade.emoji}</span>
                </div>
                {r.covered?(
                  <>
                    <div className="h-1.5 bg-stone-100 rounded-full mb-1"><div className="h-full rounded-full" style={{width:`${r.rate}%`,backgroundColor:r.grade.color}}/></div>
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-400">{fmtNum(r.schoolCount)} schools</span>
                      <span className="font-bold" style={{color:r.grade.color}}>{r.rate}%</span>
                    </div>
                  </>
                ):<p className="text-xs text-stone-400">Not yet covered</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab==='trend'&&(
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-ink mb-4">National Monthly Meals Trend</h3>
            {monthly.length>0?(
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthly}>
                  <defs><linearGradient id="natAGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9882C" stopOpacity={0.3}/><stop offset="95%" stopColor="#C9882C" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                  <Area type="monotone" dataKey="meals" stroke="#C9882C" fill="url(#natAGrad)" strokeWidth={2.5}/>
                </AreaChart>
              </ResponsiveContainer>
            ):<p className="text-stone-300 text-sm text-center py-16">No trend data</p>}
          </Card>
        </div>
      )}

      {tab==='insights'&&(
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {strengths.length>0&&<InsightCard title="💪 National Strengths" items={strengths} tone="emerald"/>}
            {weaknesses.length>0&&<InsightCard title="⚠️ National Weaknesses" items={weaknesses} tone="rust"/>}
            {recommendations.length>0&&<InsightCard title="💡 Strategic Recommendations" items={recommendations} tone="amber"/>}
          </div>
          <Card>
            <h3 className="font-semibold text-ink mb-4">National Programme KPIs vs Targets</h3>
            <div className="space-y-3">
              {[
                ['National Compliance',natCompRate,80,'%'],
                ['Regions Covered',Math.round(coveredRegions.length/16*100),100,'% (16 regions)'],
                ['Schools Enrolled',Math.min(100,Math.round(schools.length/4000*100)),100,'% of 4,000+ target'],
                ['Caterer Performance',caterers.length>0?Math.round(caterers.reduce((s,c)=>{const r=c.approved+c.pending>0?c.approved/(c.approved+c.pending):0;return s+r},0)/caterers.length*100):0,90,'% avg compliance'],
              ].map(([label,value,target,unit])=>{
                const met = value>=target;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-stone-600">{label}</span>
                      <div className="flex items-center gap-2"><span className={`font-bold ${met?'text-emerald':'text-rust'}`}>{value}{unit}</span><span className="text-xs text-stone-400">target: {target}{unit}</span><span>{met?'✅':'⚠️'}</span></div>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full"><div className={`h-full rounded-full ${met?'bg-emerald':value>=60?'bg-amber':'bg-rust'}`} style={{width:`${Math.min(100,value)}%`,backgroundColor:met?'#059669':value>=60?'#C9882C':'#C0392B'}}/></div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Region detail modal */}
      <Modal open={!!selReg} onClose={()=>setSel(null)} title={`${selReg?.name} — Region Details`} size="md">
        {selReg&&(
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 text-center ${selReg.rate>=80?'border-emerald/30 bg-emerald/5':selReg.rate>=60?'border-amber/30 bg-amber/5':'border-rust/30 bg-rust/5'}`}>
              <div className="text-4xl mb-1">{selReg.grade?.emoji}</div>
              <div className="text-3xl font-bold font-serif" style={{color:selReg.grade?.color}}>{selReg.rate}%</div>
              <div className="text-sm text-stone-500">{selReg.grade?.label} — {selReg.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['Schools',fmtNum(selReg.schoolCount)],['Total Reports',fmtNum(selReg.reports?.length||0)],['Approved',fmtNum(selReg.approved)],['Total Meals',fmtNum(selReg.meals)],['Compliance',`${selReg.rate}%`],['Grade',selReg.grade?.label]].map(([l,v])=>(
                <div key={l} className="bg-stone-50 rounded-xl p-3"><div className="text-xs text-stone-400">{l}</div><div className="font-semibold text-ink">{v||'—'}</div></div>
              ))}
            </div>
            {selReg.rate<60&&<InsightCard title="⚠️ Immediate Action Required" items={[`${selReg.name} compliance at ${selReg.rate}% — critical`,`National Director should schedule regional review within 2 weeks`,`Field inspection of all districts in this region recommended`]} tone="rust"/>}
            {selReg.rate>=90&&<InsightCard title="🏆 Commendation" items={[`${selReg.name} is a top performer at national level`,`Share regional strategy as best practice nationwide`,`Nominate for national excellence recognition`]} tone="emerald"/>}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ROUTER — pick the right dashboard based on role
══════════════════════════════════════════════════════════════ */
export default function AnalyticsDashboard({ onNavigate }) {
  const { user } = useAuth();
  const tier = ROLE_TIER(user.role);

  if (tier === 'school' || tier === 'district') return <DistrictAnalytics/>;
  if (tier === 'regional') return <RegionalAnalytics/>;
  return <NationalAnalytics/>;
}