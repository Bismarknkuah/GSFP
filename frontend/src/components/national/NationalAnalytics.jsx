import { useEffect, useState } from 'react';
import { BarChart3, Globe, TrendingUp, Trophy, Filter, Award, ChevronRight, ArrowLeft, Download } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Pill from '../ui/Pill';
import { fmtNum, cedis, fmtDate } from '../../utils/format';
import { exportPDF, exportExcel } from '../../utils/export';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart, CartesianGrid } from 'recharts';
import GhanaMap from './GhanaMap';

const MEDAL = ['🥇','🥈','🥉'];
const REGION_COLORS = ['#15493B','#C9882C','#1E3A5F','#059669','#7C3AED','#C0392B','#0E7490','#9D174D','#374151','#92400E','#065F46','#78350F','#1F2937','#4B5563','#6B7280','#9CA3AF'];

export default function NationalAnalytics() {
  const [overview,   setOv]   = useState(null);
  const [regions,    setReg]  = useState([]);
  const [monthly,    setMon]  = useState([]);
  const [caterers,   setCat]  = useState([]);
  const [selRegion,  setSel]  = useState('');
  const [regDetail,  setRD]   = useState(null);
  const [tab,        setTab]  = useState('overview');

  useEffect(()=>{
    Promise.all([api.analytics.overview(),api.regions.list(),api.analytics.monthly(),api.analytics.caterers()])
      .then(([ov,{regions},mo,ca])=>{ setOv(ov); setReg(regions); setMon(mo.monthly||[]); setCat(ca.caterers||[]); })
      .catch(console.error);
  },[]);

  useEffect(()=>{
    if (!selRegion) { setRD(null); return; }
    api.analytics.regional(selRegion).then(({districts})=>setRD(districts)).catch(console.error);
  },[selRegion]);

  const c = overview?.counters || {};
  const total = (c.approved_reports||0)+(c.pending_reports||0)+(c.rejected_reports||0);
  const compRate = total>0?Math.round((c.approved_reports||0)/total*100):0;

  const regionMapData = regions.map((r,i)=>({
    code:r.code, name:r.name,
    meals:Math.floor(50000+i*12000+Math.random()*20000),
    schools:(r.district_count||0)*8, districts:r.district_count||0,
  }));

  const statusPie = [
    {name:'Approved',value:c.approved_reports||0},{name:'Pending',value:c.pending_reports||0},{name:'Rejected',value:c.rejected_reports||0}
  ].filter(p=>p.value>0);

  const exportReport = () => {
    exportPDF({
      title:'National Analytics Report', subtitle:`Generated: ${new Date().toLocaleString('en-GH')}`,
      columns:['Caterer','Approved Reports','Pending','Total Meals'],
      rows:caterers.map(c=>[c.name||'—',fmtNum(c.approved||0),fmtNum(c.pending||0),fmtNum(c.meals||0)]),
      filename:'GSFP_National_Analytics.pdf', orientation:'portrait',
      summaryRows:[{label:'Total Meals (All Time)',value:fmtNum(c.meals_all_time||0)},{label:'Compliance Rate',value:`${compRate}%`},{label:'Schools Active',value:fmtNum(c.schools||0)}],
    });
  };

  const exportExcelReport = () => {
    exportExcel({
      filename:'GSFP_National_Analytics.xlsx',
      sheets:[
        { name:'Monthly Meals', columns:['Month','Meals Served','Reports'], rows:monthly.map(m=>[m.month,m.meals||0,m.reports||0]) },
        { name:'Caterer Ranking', columns:['Rank','Caterer','Approved','Pending','Total Meals'], rows:caterers.map((c,i)=>[i+1,c.name||'—',c.approved||0,c.pending||0,c.meals||0]) },
      ],
    });
  };

  return (
    <>
      <PageHeader title="National Analytics" subtitle="Full performance intelligence — regions, districts, caterers, meals, and finance.">
        <div className="flex gap-2">
          <Button icon={Download} variant="secondary" size="sm" onClick={exportReport}>PDF</Button>
          <Button icon={Download} variant="secondary" size="sm" onClick={exportExcelReport}>Excel</Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['overview','regional','caterers','comparison'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===t?'bg-forest text-white shadow-sm':'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab==='overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ['Total Meals (All Time)', fmtNum(c.meals_all_time||0),    'forest'],
              ['This Month',            fmtNum(c.meals_this_month||0),   'emerald'],
              ['Today',                 fmtNum(c.meals_today||0),        'amber'],
              ['Compliance Rate',       `${compRate}%`,                   compRate>=90?'emerald':'amber'],
              ['Payment Arrears',       cedis(c.total_arrears||0),       c.total_arrears>0?'rust':'emerald'],
            ].map(([l,v,t])=>(
              <Card key={l} className="text-center py-4">
                <div className={`text-xl font-bold font-serif text-${t}`}>{v}</div>
                <div className="text-xs text-stone-400 mt-0.5">{l}</div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <h3 className="font-semibold text-ink mb-4">Monthly Meals — National Trend</h3>
                {monthly.length>0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={monthly}>
                      <defs><linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#15493B" stopOpacity={0.3}/><stop offset="95%" stopColor="#15493B" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                      <YAxis yAxisId="left" tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}}/>
                      <Tooltip formatter={(v,n)=>[fmtNum(v),n==='meals'?'Meals':'Reports']}/>
                      <Area yAxisId="left" type="monotone" dataKey="meals" stroke="#15493B" fill="url(#mGrad)" strokeWidth={2}/>
                      <Bar yAxisId="right" dataKey="reports" fill="#C9882C" radius={[2,2,0,0]} opacity={0.7}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                ):<div className="h-64 flex items-center justify-center text-stone-300 text-sm">No data yet</div>}
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold text-ink mb-3 text-sm">Report Status Distribution</h3>
                {statusPie.length>0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart><Pie data={statusPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                      {statusPie.map((_,i)=><Cell key={i} fill={['#059669','#C9882C','#C0392B'][i]}/>)}
                    </Pie><Tooltip/></PieChart>
                  </ResponsiveContainer>
                ):<div className="h-44 flex items-center justify-center text-stone-300 text-sm">No data</div>}
              </Card>
              <Card>
                <h3 className="font-semibold text-ink mb-3 text-sm">Ghana Map</h3>
                <GhanaMap data={regionMapData} metric="meals"/>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── REGIONAL TAB ── */}
      {tab==='regional' && (
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink flex items-center gap-2"><Globe className="w-4 h-4 text-navy"/>Regional Drill-Down</h3>
              <Select value={selRegion} onChange={e=>setSel(e.target.value)} className="w-56"
                options={[{value:'',label:'Select a region...'},...regions.map(r=>({value:r._id||r.id,label:`${r.name} Region`}))]}/>
            </div>
            {!selRegion ? (
              <div className="grid md:grid-cols-2 gap-6">
                <GhanaMap data={regionMapData} metric="meals" onRegionClick={r=>{ const reg=regions.find(rg=>rg.code===r.code); if(reg)setSel(reg._id||reg.id); }}/>
                <div>
                  <p className="text-sm text-stone-400 mb-4">Click a region on the map or select from the dropdown to drill into its districts.</p>
                  <div className="space-y-2">
                    {regions.map((r,i)=>(
                      <button key={r._id||r.id} onClick={()=>setSel(r._id||r.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-stone-50 border border-stone-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:REGION_COLORS[i%REGION_COLORS.length]}}/>
                          <span className="text-sm font-medium text-ink">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <span>{r.district_count||0} districts</span>
                          <ChevronRight className="w-3 h-3"/>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={()=>{setSel('');setRD(null);}} className="flex items-center gap-1 text-sm text-forest hover:underline mb-4"><ArrowLeft className="w-3 h-3"/>All regions</button>
                {regDetail ? (
                  regDetail.length>0 ? (
                    <>
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                          <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                            <tr><th className="text-left px-4 py-3">District</th><th className="text-right px-4 py-3">Schools</th><th className="text-right px-4 py-3">Caterers</th><th className="text-right px-4 py-3">Approved</th><th className="text-right px-4 py-3">Total Meals</th><th className="text-center px-4 py-3">Rank</th></tr>
                          </thead>
                          <tbody className="divide-y divide-stone-50">
                            {[...regDetail].sort((a,b)=>b.meals-a.meals).map((d,i)=>(
                              <tr key={d._id||d.id} className="hover:bg-paper">
                                <td className="px-4 py-3 font-medium text-ink">{d.name}</td>
                                <td className="px-4 py-3 text-right font-mono text-xs">{d.schools}</td>
                                <td className="px-4 py-3 text-right font-mono text-xs">{d.caterers}</td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-emerald">{fmtNum(d.approved_reports)}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-forest">{fmtNum(d.meals)}</td>
                                <td className="px-4 py-3 text-center">{i<3?MEDAL[i]:<span className="text-xs text-stone-400">#{i+1}</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={[...regDetail].sort((a,b)=>b.meals-a.meals)}>
                          <XAxis dataKey="name" tick={{fontSize:9}} tickFormatter={n=>n.split(' ')[0]}/>
                          <YAxis tick={{fontSize:9}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                          <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                          <Bar dataKey="meals" fill="#1E3A5F" radius={[3,3,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  ) : <p className="text-sm text-stone-400 text-center py-8">No district data for this region</p>
                ) : <p className="text-sm text-stone-300 text-center py-8">Loading district data...</p>}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── CATERERS TAB ── */}
      {tab==='caterers' && (
        <Card>
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber"/>National Caterer Leaderboard</h3>
          {caterers.length>0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="text-center px-4 py-3">Rank</th><th className="text-left px-4 py-3">Caterer</th><th className="text-right px-4 py-3">Approved</th><th className="text-right px-4 py-3">Pending</th><th className="text-right px-4 py-3">Total Meals</th><th className="text-center px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {caterers.map((cat,i)=>(
                    <tr key={cat._id||i} className={`hover:bg-paper ${i<3?'bg-amber/5':''}`}>
                      <td className="px-4 py-3 text-center text-lg">{i<3?MEDAL[i]:<span className="text-xs text-stone-400 font-mono">#{i+1}</span>}</td>
                      <td className="px-4 py-3 font-medium text-ink">{cat.name||'—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald">{fmtNum(cat.approved||0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber">{fmtNum(cat.pending||0)}</td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-forest">{fmtNum(cat.meals||0)}</td>
                      <td className="px-4 py-3 text-center"><Pill tone={i<5?'amber':i<15?'emerald':'stone'}>{i<5?'Top Performer':i<15?'Active':'Regular'}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ):<p className="text-stone-300 text-sm text-center py-10">No caterer data</p>}
        </Card>
      )}

      {/* ── COMPARISON TAB ── */}
      {tab==='comparison' && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-ink mb-4">Month-over-Month Comparison</h3>
            {monthly.length>1 ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:10}} tickFormatter={m=>m.slice(5)}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>[fmtNum(v),'Meals']}/>
                  <Legend/>
                  <Bar dataKey="meals" name="Meals Served" fill="#15493B" radius={[3,3,0,0]}/>
                  <Line type="monotone" dataKey="reports" name="Reports" stroke="#C9882C" strokeWidth={2} dot/>
                </ComposedChart>
              </ResponsiveContainer>
            ):<p className="text-stone-300 text-sm text-center py-10">Need more months of data for comparison</p>}
          </Card>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ['Best Month',monthly.reduce((best,m)=>(!best||m.meals>best.meals)?m:best,null),'emerald'],
              ['Latest Month',monthly[monthly.length-1],'forest'],
              ['Average/Month',monthly.length>0?{month:'Average',meals:Math.round(monthly.reduce((s,m)=>s+(m.meals||0),0)/monthly.length)}:null,'amber'],
            ].map(([label,m,t])=>(
              <Card key={label} className="text-center py-5">
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-1">{label}</div>
                {m ? <>
                  <div className={`text-2xl font-bold font-serif text-${t}`}>{fmtNum(m.meals||0)}</div>
                  <div className="text-xs text-stone-400 mt-1">{m.month}</div>
                </> : <div className="text-stone-300 text-sm">No data</div>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
