import { useEffect, useState } from 'react';
import { Settings, Globe, Users, DollarSign, ShieldCheck, Bell, Database, ChevronRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Pill from '../ui/Pill';
import { ROLE_LABELS, GHANA_REGIONS } from '../../utils/format';

const SECTIONS=[
  {id:'overview',      label:'System Overview',      icon:Settings},
  {id:'regions',       label:'Region Registry',       icon:Globe},
  {id:'rbac',          label:'Roles & Permissions',   icon:ShieldCheck},
  {id:'finance',       label:'Financial Policies',    icon:DollarSign},
  {id:'security',      label:'Security Settings',     icon:ShieldCheck},
  {id:'notifications', label:'Notification Rules',    icon:Bell},
  {id:'data',          label:'Data & Compliance',     icon:Database},
];

const PERM_COLS=['Manage Regions','Manage Users','Approve Budgets','View All Reports','Bulk Upload','Sys Config'];
const ROLE_PERMS={
  ceo:                 [true, true, true, true, true, true],
  national_director:   [true, true, true, true, true, true],
  super_admin:         [true, true, true, true, true, true],
  national_admin:      [true, true, false,true, true, false],
  national_finance:    [false,false,true, true, true, false],
  regional_coordinator:[false,true, false,true, true, false],
  regional_admin:      [false,true, false,true, false,false],
  district_director:   [false,true, false,true, false,false],
  district_coordinator:[false,false,false,true, true, false],
  finance_officer:     [false,false,false,true, true, false],
  caterer:             [false,false,false,false,false,false],
  headmaster:          [false,false,false,false,false,false],
};

const roleGroups=[
  {tier:'Executive', color:'#0d1117',roles:['ceo','national_director']},
  {tier:'National',  color:'#1a1a2e',roles:['super_admin','national_admin','national_finance']},
  {tier:'Regional',  color:'#7C3AED',roles:['regional_minister','regional_coordinator','regional_admin','regional_finance','regional_auditor']},
  {tier:'District',  color:'#15493B',roles:['district_director','district_coordinator','district_admin','finance_officer','auditor','monitoring_officer','data_entry']},
  {tier:'School',    color:'#C9882C',roles:['caterer','headmaster','readonly']},
];

export default function SystemConfig() {
  const [sec,   setSec]  = useState('overview');
  const [regions,setReg] = useState([]);
  const [users,  setUsr] = useState([]);
  const [stats,  setSt]  = useState({});
  const [load,   setLoad]= useState(true);
  const [error,  setErr] = useState(null);

  const fetchData = () => {
    setLoad(true); setErr(null);
    Promise.allSettled([
      api.regions.list(),
      api.users.list(),
      api.analytics.overview(),
    ]).then(([rRes, uRes, ovRes]) => {
      if (rRes.status==='fulfilled') setReg(rRes.value?.regions||[]);
      if (uRes.status==='fulfilled') setUsr(uRes.value?.users||[]);
      if (ovRes.status==='fulfilled') setSt(ovRes.value?.counters||{});
      // Show error only if ALL failed
      if ([rRes,uRes,ovRes].every(r=>r.status==='rejected')) setErr('Could not load config data. Check backend connection.');
    }).finally(()=>setLoad(false));
  };

  useEffect(()=>{ fetchData(); },[]);

  const count = (role) => users.filter(u=>u.role===role).length;

  if (load) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin"/>
      <p className="text-stone-400 text-sm">Loading system configuration...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="w-10 h-10 text-rust opacity-50"/>
      <p className="text-stone-500 text-sm text-center max-w-sm">{error}</p>
      <Button onClick={fetchData} icon={RefreshCw} variant="secondary">Retry</Button>
    </div>
  );

  return (
    <>
      <PageHeader title="System Configuration" subtitle="Platform governance, role permissions, security policies and compliance settings."/>
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <Card noPadding className="h-fit">
          <div className="divide-y divide-stone-50">
            {SECTIONS.map(s=>(
              <button key={s.id} onClick={()=>setSec(s.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${sec===s.id?'bg-forest text-white':'text-stone-600 hover:bg-stone-50'}`}>
                <span className="flex items-center gap-2.5"><s.icon className="w-4 h-4"/>{s.label}</span>
                <ChevronRight className="w-3 h-3 opacity-40"/>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-4">

          {/* ── OVERVIEW ── */}
          {sec==='overview'&&(
            <>
              <Card>
                <h3 className="font-semibold text-ink mb-4">System Status</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    ['Platform',    'GSFP Management System v2.0',          'emerald'],
                    ['Version',     'Phase 1+2 Complete',                    'forest'],
                    ['Auth',        'JWT Bearer — 12 hour expiry',          'emerald'],
                    ['RBAC',        `${Object.keys(ROLE_PERMS).length}+ roles configured`, 'emerald'],
                    ['Database',    'MongoDB Atlas (cloud)',                  'emerald'],
                    ['Chatbot',     'AI-powered + FAQ knowledge base',       'emerald'],
                    ['Regions',     `${regions.length} of 16 registered`,   regions.length===16?'emerald':'amber'],
                    ['Backend URL', import.meta.env.VITE_BACKEND_URL||'localhost:4000','stone'],
                  ].map(([l,v,t])=>(
                    <div key={l} className={`bg-${t}/5 border border-${t}/20 rounded-xl p-3`}>
                      <div className="text-xs text-stone-400">{l}</div>
                      <div className="font-semibold text-ink text-sm mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h3 className="font-semibold text-ink mb-4">Platform Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[['Regions',regions.length,'navy'],['Districts',stats?.districts||0,'forest'],['Schools',stats?.schools||0,'emerald'],['Users',users.length,'amber'],['Reports',(stats?.approved_reports||0)+(stats?.pending_reports||0)+(stats?.rejected_reports||0),'stone']].map(([l,v,t])=>(
                    <div key={l} className="text-center bg-stone-50 rounded-xl py-4">
                      <div className={`text-2xl font-bold font-serif text-${t}`}>{v}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* ── REGIONS ── */}
          {sec==='regions'&&(
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink">Ghana's 16 Regions</h3>
                <Pill tone={regions.length===16?'emerald':'amber'}>{regions.length}/16 registered</Pill>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {GHANA_REGIONS.map(name=>{
                  const r=regions.find(rg=>rg.name===name);
                  return (
                    <div key={name} className={`flex items-center justify-between p-3 rounded-xl border ${r?'border-emerald/30 bg-emerald/5':'border-stone-100 bg-stone-50'}`}>
                      <div>
                        <div className="text-sm font-medium text-ink">{name}</div>
                        {r&&<div className="text-xs text-stone-400">{r.district_count||0} districts · {r.capital}</div>}
                      </div>
                      <Pill tone={r?'emerald':'stone'}>{r?'Registered':'Not Registered'}</Pill>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── RBAC ── */}
          {sec==='rbac'&&(
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold text-ink mb-4">Permission Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-400">
                      <tr>
                        <th className="text-left px-3 py-2.5 min-w-[160px]">Role</th>
                        {PERM_COLS.map(c=><th key={c} className="text-center px-2 py-2.5 min-w-[80px]">{c}</th>)}
                        <th className="text-center px-2 py-2.5">Users</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {Object.entries(ROLE_PERMS).map(([role,perms])=>(
                        <tr key={role} className="hover:bg-paper">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-ink">{ROLE_LABELS[role]||role}</div>
                            <div className="text-[9px] text-stone-300 font-mono">{role}</div>
                          </td>
                          {perms.map((has,i)=>(
                            <td key={i} className="px-2 py-2.5 text-center">
                              {has?<CheckCircle2 className="w-4 h-4 text-emerald mx-auto"/>:<div className="w-4 h-4 rounded-full border-2 border-stone-200 mx-auto"/>}
                            </td>
                          ))}
                          <td className="px-2 py-2.5 text-center font-bold font-mono text-forest">{count(role)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              {roleGroups.map(g=>(
                <Card key={g.tier}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{backgroundColor:g.color}}>{g.tier} Tier</div>
                    <span className="text-xs text-stone-400">{g.roles.length} roles · {g.roles.reduce((s,r)=>s+count(r),0)} active users</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {g.roles.map(r=>(
                      <div key={r} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl">
                        <div><div className="text-sm font-medium text-ink">{ROLE_LABELS[r]||r}</div><div className="text-[9px] text-stone-300 font-mono">{r}</div></div>
                        <div className="text-sm font-bold text-forest">{count(r)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ── FINANCE ── */}
          {sec==='finance'&&(
            <Card>
              <h3 className="font-semibold text-ink mb-4">Financial Policies</h3>
              <div className="divide-y divide-stone-50">
                {[
                  ['Daily rate per pupil','GHS 2.00 (Ghana Cedi)'],
                  ['Disbursement approval','CEO / National Director must approve before funds release'],
                  ['Budget chain','National → Regional Allocation → District → Caterer Payment'],
                  ['Arrears formula','Days Covered − Days Paid × Enrolled Pupils × GHS 2.00'],
                  ['Bulk upload format','CSV: school_code, period, days_covered, days_paid, payment_date'],
                  ['Export compliance','Ghana Audit Service compliant — PDF + Excel with full headers'],
                  ['Fiscal year','Academic year basis (e.g. 2025/2026)'],
                  ['Payment periods','Term 1, Term 2, Term 3, or Full Year'],
                  ['Duplicate check','Per caterer + period — updates existing record on re-upload'],
                  ['Currency','Ghana Cedi (GHS) — all amounts in GHS'],
                ].map(([l,v])=>(
                  <div key={l} className="flex items-start justify-between py-3 gap-4">
                    <span className="text-sm text-stone-500 flex-shrink-0">{l}</span>
                    <span className="text-sm font-semibold text-ink text-right">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── SECURITY ── */}
          {sec==='security'&&(
            <Card>
              <h3 className="font-semibold text-ink mb-4">Security Configuration</h3>
              <div className="space-y-2">
                {[
                  ['JWT Authentication',        'Active — 12h token expiry',                'emerald'],
                  ['RBAC Enforcement',           '20 roles + scope isolation',               'emerald'],
                  ['Password Hashing',           'bcryptjs — 10 salt rounds',                'emerald'],
                  ['Audit Logging',              'Every action logged with timestamp + user','emerald'],
                  ['CEO Approval Workflow',      'All disbursements require CEO sign-off',   'emerald'],
                  ['Data Scope Isolation',       'Users only see their region/district',     'emerald'],
                  ['Admin Password Reset',       'Senior admins only — temp password system','emerald'],
                  ['Profile Pictures',           'Optional — server-side storage',           'emerald'],
                  ['Multi-Factor Auth (MFA)',    'Planned — Phase 3',                        'stone'],
                  ['Biometric Login',            'Planned — Phase 4',                        'stone'],
                  ['Ghana Card Verification',    'Future integration',                       'stone'],
                ].map(([l,v,t])=>(
                  <div key={l} className={`flex items-center justify-between p-3 rounded-xl bg-${t}/5 border border-${t}/15`}>
                    <span className="text-sm font-medium text-ink">{l}</span><Pill tone={t}>{v}</Pill>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── NOTIFICATIONS ── */}
          {sec==='notifications'&&(
            <Card>
              <h3 className="font-semibold text-ink mb-4">Notification Rules</h3>
              <div className="space-y-2">
                {[
                  ['Report submitted',          'Headmaster — immediate notification',         'emerald'],
                  ['Report approved/rejected',  'Caterer — immediate on decision',             'emerald'],
                  ['Disbursement requested',    'CEO / National Director — awaiting approval', 'emerald'],
                  ['Disbursement approved',     'National Finance — ready to execute',         'emerald'],
                  ['Chatbot question escalated','All admins — new pending question',           'emerald'],
                  ['Payment arrears',           'DFC + RFC — weekly summary',                 'emerald'],
                  ['Bulk upload complete',      'Uploader — immediate result',                'emerald'],
                  ['Email notifications',       'Planned — Nodemailer SMTP',                  'stone'],
                  ['SMS alerts (Twilio)',        'Planned — Phase 2',                          'stone'],
                  ['Push notifications (PWA)',   'Planned — Phase 2',                          'stone'],
                ].map(([l,v,t])=>(
                  <div key={l} className={`flex items-center justify-between p-3 rounded-xl bg-${t}/5 border border-${t}/15`}>
                    <span className="text-sm font-medium text-ink">{l}</span><Pill tone={t}>{v}</Pill>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── DATA ── */}
          {sec==='data'&&(
            <Card>
              <h3 className="font-semibold text-ink mb-4">Data Management & Compliance</h3>
              <div className="space-y-2">
                {[
                  ['Database',              'MongoDB Atlas — managed cloud',              'emerald'],
                  ['Automated backups',     'MongoDB Atlas daily snapshot backups',       'emerald'],
                  ['Audit trail',           'Full immutable log of all actions',          'emerald'],
                  ['PDF export',            'jsPDF — GSFP branded with autotable',        'emerald'],
                  ['Excel export',          'SheetJS XLSX — multi-sheet with summaries',  'emerald'],
                  ['Disbursement ledger',   'Full CEO-approved financial trail',          'emerald'],
                  ['Chatbot knowledge base','MongoDB FAQ — auto-learning from answers',   'emerald'],
                  ['Ghana Audit Service',   'Export formats compliant with GAS standards','emerald'],
                  ['Data Protection Act',   'Ghana DPA 2012 compliant',                  'amber'],
                  ['Data retention',        'Indefinite — configurable per policy',       'amber'],
                ].map(([l,v,t])=>(
                  <div key={l} className={`flex items-center justify-between p-3 rounded-xl bg-${t}/5 border border-${t}/15`}>
                    <span className="text-sm font-medium text-ink">{l}</span><Pill tone={t}>{v}</Pill>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
