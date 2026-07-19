import { useState } from 'react';
import {
  LayoutDashboard, ClipboardCheck, BookOpen, Send, MessageSquare, User, Shield, KeyRound,
  LogOut, Menu, X, MapPin, Building2, School, Users, DollarSign, FileText, CreditCard,
  BarChart3, ScrollText, Upload, Settings, Bot, Activity, Landmark, Banknote, Wallet,
  CalendarDays, ClipboardList, Bell, Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, ROLE_TIER } from '../../utils/format';

/* ── Navigation per role ─────────────────────────────────────── */
const NAV = (role) => {
  const tier = ROLE_TIER(role);

  // ── School level ──
  if (role === 'caterer') return [
    { id:'overview', label:'Dashboard',      icon:LayoutDashboard },
    { id:'expenses', label:'My Expenses',    icon:Wallet },
    { id:'payments', label:'My Payments',    icon:CreditCard },
    { id:'history',  label:'Report History', icon:BookOpen },
    { id:'official-reports', label:'Official Reports', icon:Send },
    { id:'messages', label:'Messages',       icon:MessageSquare },
  ];

  if (role === 'headmaster') return [
    { id:'overview', label:'Dashboard',         icon:LayoutDashboard },
    { id:'pending',  label:'Pending Approvals', icon:ClipboardCheck },
    { id:'history',  label:'Report History',    icon:BookOpen },
    { id:'official-reports', label:'Official Reports', icon:Send },
    { id:'messages', label:'Messages',          icon:MessageSquare },
  ];

  // ── District level ──
  if (role === 'dce') return [
    { id:'overview', label:'Approvals',  icon:ClipboardCheck },
    { id:'reports',  label:'Reports',    icon:FileText },
    { id:'schools',  label:'Schools',    icon:School },
    { id:'analytics',label:'Analytics',  icon:BarChart3 },
    { id:'messages', label:'Messages',   icon:MessageSquare },
  ];

  if (role === 'district_coordinator' || role === 'coordinator') return [
    { id:'overview',        label:'Dashboard',       icon:LayoutDashboard },
    { id:'school-requests', label:'Schools & Menu',  icon:Building2 },
    { id:'reports',         label:'Reports',         icon:FileText },
    { id:'payments',        label:'Payments',        icon:CreditCard },
    { id:'analytics',       label:'Analytics',       icon:BarChart3 },
    { id:'bulk-upload',     label:'Bulk Upload',     icon:Upload },
    { id:'messages',        label:'Messages',        icon:MessageSquare },
  ];

  if (role === 'monitoring_officer') return [
    { id:'overview',   label:'M&E Dashboard', icon:Activity },
    { id:'monitoring', label:'Monitoring',    icon:BarChart3 },
    { id:'official-reports', label:'Official Reports', icon:Send },
    { id:'reports',    label:'Reports',       icon:FileText },
    { id:'schools',    label:'Schools',       icon:School },
    { id:'analytics',  label:'Analytics',     icon:BarChart3 },
    { id:'messages',   label:'Messages',      icon:MessageSquare },
  ];

  if (role === 'finance_officer') return [
    { id:'overview',  label:'Payment Approvals', icon:DollarSign },
    { id:'finance',   label:'Finance Portal',    icon:Banknote },
    { id:'payments',  label:'Payments',          icon:CreditCard },
    { id:'reports',   label:'Reports',           icon:FileText },
    { id:'analytics', label:'Analytics',         icon:BarChart3 },
    { id:'messages',  label:'Messages',          icon:MessageSquare },
  ];

  if (role === 'auditor') return [
    { id:'overview',       label:'Audit Dashboard', icon:Shield },
    { id:'audit-analysis', label:'Audit Analysis',  icon:Search },
    { id:'reports',        label:'Reports',         icon:FileText },
    { id:'payments',       label:'Payments',        icon:CreditCard },
    { id:'audit',          label:'Audit Log',       icon:ScrollText },
    { id:'messages',       label:'Messages',        icon:MessageSquare },
  ];

  if (role === 'district_director' || tier === 'district') return [
    { id:'overview',  label:'Dashboard',  icon:LayoutDashboard },
    { id:'schools',   label:'Schools',    icon:School },
    { id:'reports',   label:'Reports',    icon:FileText },
    { id:'payments',  label:'Payments',   icon:CreditCard },
    { id:'users',     label:'Users',      icon:Users },
    { id:'analytics', label:'Analytics',  icon:BarChart3 },
    { id:'bulk-upload', label:'Bulk Upload', icon:Upload },
    { id:'official-reports', label:'Official Reports', icon:Send },
    { id:'messages',  label:'Messages',   icon:MessageSquare },
  ];

  // ── Regional level ──
  if (tier === 'regional') {
    const base = [
      { id:'overview',  label:'Dashboard',  icon:LayoutDashboard },
      { id:'districts', label:'Districts',  icon:Building2 },
      { id:'schools',   label:'Schools',    icon:School },
      { id:'reports',   label:'Reports',    icon:FileText },
      { id:'payments',  label:'Payments',   icon:CreditCard },
      { id:'analytics', label:'Analytics',  icon:BarChart3 },
      { id:'messages',  label:'Messages',   icon:MessageSquare },
    ];
    if (role === 'regional_finance')    base.splice(1,0,{ id:'finance-dash', label:'Payment Approvals', icon:DollarSign });
    if (role === 'regional_monitoring') base.splice(1,0,{ id:'monitoring', label:'M&E Dashboard', icon:Activity });
    if (role === 'regional_auditor')    base.splice(1,0,{ id:'audit-analysis', label:'Audit Analysis', icon:Search });
    return base;
  }

  // ── Executive ──
  if (['ceo','national_director'].includes(role)) return [
    { id:'overview',      label:'Executive Dashboard', icon:Landmark },
    { id:'natanalytics',  label:'National Analytics',  icon:BarChart3 },
    { id:'natreports',    label:'Reports Hub',         icon:FileText },
    { id:'natfinance',    label:'Finance',             icon:DollarSign },
    { id:'disbursements', label:'Disbursements',       icon:Banknote },
    { id:'sysconfig',     label:'System Config',       icon:Settings },
    { id:'official-reports', label:'Official Reports', icon:Send },
    { id:'audit',         label:'Audit Log',           icon:ScrollText },
    { id:'messages',      label:'Messages',            icon:MessageSquare },
  ];

  // ── National (super_admin, national_admin, etc.) ──
  const natBase = [
    { id:'overview',   label:'Dashboard',   icon:LayoutDashboard },
    { id:'regions',    label:'Regions',     icon:MapPin },
    { id:'districts',  label:'Districts',   icon:Building2 },
    { id:'schools',    label:'Schools',     icon:School },
    { id:'users',      label:'Users',       icon:Users },
    { id:'reports',    label:'Reports',     icon:FileText },
    { id:'payments',   label:'Payments',    icon:CreditCard },
    { id:'finance',    label:'Finance',     icon:Banknote },
    { id:'disbursements', label:'Disbursements', icon:DollarSign },
    { id:'analytics',  label:'Analytics',   icon:BarChart3 },
    { id:'bulk-upload',label:'Bulk Upload', icon:Upload },
    { id:'audit',      label:'Audit Log',   icon:ScrollText },
    { id:'messages',   label:'Messages',    icon:MessageSquare },
  ];
  if (role === 'super_admin') {
    natBase.push({ id:'sysconfig',     label:'System Config', icon:Settings });
    natBase.push({ id:'chatbot-admin', label:'Chatbot Admin', icon:Bot });
    natBase.push({ id:'agents',        label:'AI Agents',     icon:Activity });
  }
  if (role === 'national_finance')    natBase.splice(1,0,{ id:'finance-dash', label:'Payment Approvals', icon:DollarSign });
  if (role === 'national_monitoring') natBase.splice(1,0,{ id:'monitoring', label:'M&E Dashboard', icon:Activity });
  if (role === 'national_auditor')    natBase.splice(1,0,{ id:'audit-analysis', label:'Audit Analysis', icon:Search });
  return natBase;
};

const ACCOUNT_NAV = [
  { id:'profile',  label:'My Profile',      icon:User },
  { id:'mfa',      label:'MFA Security',    icon:Shield },
  { id:'password', label:'Change Password', icon:KeyRound },
];

const TIER_LABEL = { national:'National Level', regional:'Regional Level', district:'District Level', school:'School Level' };

export default function Shell({ view, onNavigate, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const nav  = NAV(user.role);
  const tier = ROLE_TIER(user.role);
  const initials = (user.name||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  const NavButton = ({ item }) => {
    const Icon = item.icon;
    const active = view === item.id;
    return (
      <button
        onClick={() => { onNavigate(item.id); setOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all
          ${active
            ? 'bg-[#C9882C] text-white font-semibold shadow-sm'
            : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
        <Icon className="w-4 h-4 flex-shrink-0"/>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{background:'#0d3321'}}>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:'linear-gradient(135deg,#C9882C,#a36820)'}}>
            <Landmark className="w-5 h-5 text-white"/>
          </div>
          <div className="min-w-0">
            <div className="text-[8px] font-bold tracking-[0.25em] uppercase" style={{color:'rgba(201,136,44,0.8)'}}>Republic of Ghana</div>
            <div className="text-sm font-bold text-white leading-tight">School Feeding Programme</div>
            <div className="text-[9px] tracking-widest uppercase text-white/30">{TIER_LABEL[tier]}</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[9px] text-white/40 uppercase tracking-wider truncate">{ROLE_LABELS[user.role]||user.role}</div>
            <div className="text-sm font-semibold text-white truncate">{user.name}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1"
        style={{scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.15) transparent'}}>
        {nav.map(item => <NavButton key={item.id} item={item}/>)}

        <div className="pt-4 pb-1 px-4 text-[9px] font-bold tracking-[0.25em] uppercase text-white/25">Account</div>
        {ACCOUNT_NAV.map(item => <NavButton key={item.id} item={item}/>)}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/10">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/60 hover:bg-rust/20 hover:text-white transition-all">
          <LogOut className="w-4 h-4"/>Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{background:'#faf7f2'}}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0 fixed inset-y-0 left-0 z-30">
        <Sidebar/>
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex-shrink-0"><Sidebar/></div>
          <div className="flex-1 bg-black/40" onClick={()=>setOpen(false)}/>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3"
          style={{background:'#0d3321'}}>
          <button onClick={()=>setOpen(true)} className="text-white p-1"><Menu className="w-5 h-5"/></button>
          <span className="text-sm font-bold text-white">GSFP</span>
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">{initials}</div>
        </div>

        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}