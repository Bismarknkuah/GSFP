import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, School, Users, FileText, CreditCard, MessageSquare, BarChart3, MapPin, Globe, DollarSign, ShieldCheck, ClipboardList, BookOpen, ClipboardCheck, LogOut, Menu, Landmark, Settings, Upload, Lock, User, Activity, TrendingUp, CheckCircle2, Bot, Shield, Send } from 'lucide-react';
import { ROLE_LABELS, ROLE_TIER } from '../../utils/format';

const BASE = import.meta.env.VITE_BACKEND_URL || '';

const NAV = {
  ceo: [
    { id:'overview',        label:'Executive Centre',      icon:Landmark },
    { section:'National Oversight' },
    { id:'natanalytics',    label:'National Analytics',    icon:BarChart3 },
    { id:'natreports',      label:'Reports Hub',           icon:FileText },
    { id:'natfinance',      label:'Finance Portal',        icon:DollarSign },
    { id:'disbursements',   label:'Disbursement Ledger',   icon:CreditCard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { section:'Administration' },
    { id:'regions',         label:'Regions',               icon:Globe },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'All Users',             icon:Users },
    { section:'System' },
    { id:'agents',          label:'AI Agent Monitor',      icon:Bot },
    { id:'audit',           label:'Audit Trail',           icon:ShieldCheck },
    { id:'chatbot-admin',   label:'Chatbot Manager',       icon:MessageSquare },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { id:'sysconfig',       label:'System Config',         icon:Settings },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  national_director: [
    { id:'overview',        label:'Coordination Hub',      icon:Landmark },
    { section:'National' },
    { id:'natanalytics',    label:'National Analytics',    icon:BarChart3 },
    { id:'natreports',      label:'Reports Hub',           icon:FileText },
    { id:'natfinance',      label:'Finance Portal',        icon:DollarSign },
    { id:'disbursements',   label:'Disbursement Ledger',   icon:CreditCard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { section:'Management' },
    { id:'regions',         label:'Regions',               icon:Globe },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'All Users',             icon:Users },
    { section:'System' },
    { id:'agents',          label:'AI Agent Monitor',      icon:Bot },
    { id:'chatbot-admin',   label:'Chatbot Manager',       icon:MessageSquare },
    { id:'audit',           label:'Audit Trail',           icon:ShieldCheck },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { id:'bulk-upload',     label:'Bulk Upload',           icon:Upload },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  super_admin: [
    { id:'overview',        label:'National Command',      icon:Landmark },
    { section:'Administration' },
    { id:'regions',         label:'Regions (16)',          icon:Globe },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'All Users',             icon:Users },
    { section:'National' },
    { id:'natfinance',      label:'National Finance',      icon:DollarSign },
    { id:'disbursements',   label:'Disbursements',         icon:CreditCard },
    { id:'natreports',      label:'Reports Hub',           icon:FileText },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'natanalytics',    label:'National Analytics',    icon:BarChart3 },
    { section:'System' },
    { id:'agents',          label:'AI Agent Monitor',      icon:Bot },
    { id:'chatbot-admin',   label:'Chatbot Manager',       icon:MessageSquare },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { id:'audit',           label:'Audit Trail',           icon:ShieldCheck },
    { id:'sysconfig',       label:'System Config',         icon:Settings },
    { id:'bulk-upload',     label:'Bulk Upload',           icon:Upload },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  national_admin: [
    { id:'overview',        label:'National Dashboard',    icon:Landmark },
    { section:'Administration' },
    { id:'regions',         label:'Regions',               icon:Globe },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'User Management',       icon:Users },
    { section:'Oversight' },
    { id:'natreports',      label:'Reports Hub',           icon:FileText },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'natanalytics',    label:'Analytics',             icon:BarChart3 },
    { id:'chatbot-admin',   label:'Chatbot Manager',       icon:MessageSquare },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { id:'audit',           label:'Audit Log',             icon:ShieldCheck },
    { id:'bulk-upload',     label:'Bulk Upload',           icon:Upload },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  national_finance: [
    { id:'overview',        label:'National Dashboard',    icon:Landmark },
    { id:'natfinance',      label:'Finance Portal',        icon:DollarSign },
    { id:'disbursements',   label:'Disbursements',         icon:CreditCard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'payments',        label:'All Payments',          icon:CreditCard },
    { id:'natreports',      label:'Reports',               icon:FileText },
    { id:'natanalytics',    label:'Analytics',             icon:BarChart3 },
    { id:'bulk-upload',     label:'Bulk Upload',           icon:Upload },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  national_auditor: [
    { id:'overview',        label:'National Audit',        icon:ShieldCheck },
    { section:'Audit Tools' },
    { id:'audit-analysis',  label:'Audit Analysis',        icon:BarChart3 },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'payments',        label:'All Payments',          icon:CreditCard },
    { id:'reports',         label:'Feeding Reports',       icon:FileText },
    { id:'natanalytics',    label:'Analytics',             icon:TrendingUp },
    { id:'audit',           label:'Audit Trail',           icon:ShieldCheck },
    { section:'Oversight' },
    { id:'regions',         label:'Regions',               icon:Globe },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  national_monitoring: [
    { id:'overview',        label:'National Monitoring',   icon:Activity },
    { id:'monitoring',      label:'M&E Dashboard',         icon:Activity },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'natanalytics',    label:'Analytics',             icon:BarChart3 },
    { id:'reports',         label:'Feeding Reports',       icon:FileText },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  regional_minister: [
    { id:'overview',        label:'Regional Dashboard',    icon:LayoutDashboard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  regional_coordinator: [
    { id:'overview',        label:'Regional Dashboard',    icon:LayoutDashboard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'District Staff',        icon:Users },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { id:'chatbot-admin',   label:'Chatbot Manager',       icon:MessageSquare },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { id:'bulk-upload',     label:'Bulk Upload',           icon:Upload },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  regional_finance: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'finance',         label:'Finance',               icon:DollarSign },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  regional_auditor: [
    { id:'overview',        label:'Regional Audit',        icon:ShieldCheck },
    { id:'audit-analysis',  label:'Audit Analysis',        icon:BarChart3 },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'reports',         label:'Feeding Reports',       icon:FileText },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'analytics',       label:'Analytics',             icon:TrendingUp },
    { id:'audit',           label:'Audit Trail',           icon:ShieldCheck },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  regional_monitoring: [
    { id:'overview',        label:'Regional Monitoring',   icon:Activity },
    { id:'monitoring',      label:'M&E Dashboard',         icon:Activity },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  regional_admin: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'districts',       label:'Districts',             icon:MapPin },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'Users',                 icon:Users },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  district_director: [
    { id:'overview',        label:'District Dashboard',    icon:LayoutDashboard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'Staff',                 icon:Users },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  dce: [
    { id:'overview',        label:'DCE Dashboard',         icon:ClipboardCheck },
    { id:'dce-approvals',   label:'Report Approvals',      icon:CheckCircle2 },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'reports',         label:'Feeding Reports',       icon:FileText },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'analytics',       label:'District Analytics',    icon:BarChart3 },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  district_coordinator: [
    { id:'overview',        label:'District Dashboard',    icon:LayoutDashboard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { id:'chatbot-admin',   label:'Chatbot Manager',       icon:MessageSquare },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { id:'bulk-upload',     label:'Bulk Upload',           icon:Upload },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  finance_officer: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'finance',         label:'Finance',               icon:DollarSign },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'bulk-upload',     label:'Bulk Upload',           icon:Upload },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  auditor: [
    { id:'overview',        label:'District Audit',        icon:ShieldCheck },
    { id:'audit-analysis',  label:'Audit Analysis',        icon:BarChart3 },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'reports',         label:'Feeding Reports',       icon:FileText },
    { id:'payments',        label:'Payments',              icon:CreditCard },
    { id:'audit',           label:'Audit Trail',           icon:ShieldCheck },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  monitoring_officer: [
    { id:'overview',        label:'M&E Dashboard',         icon:Activity },
    { id:'monitoring',      label:'Monitoring',            icon:Activity },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  headmaster: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'pending',         label:'Pending Approvals',     icon:ClipboardCheck },
    { id:'history',         label:'Report History',        icon:BookOpen },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  caterer: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'submit',          label:'Submit Report',         icon:ClipboardList },
    { id:'history',         label:'My Reports',            icon:BookOpen },
    { id:'payments',        label:'Payment Records',       icon:CreditCard },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  district_admin: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'users',           label:'Users',                 icon:Users },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'official-reports',label:'Official Reports',      icon:Send },
    { id:'messages',        label:'Messages',              icon:MessageSquare },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  data_entry: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'submit',          label:'Submit',                icon:ClipboardList },
    { id:'reports',         label:'Reports',               icon:FileText },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'mfa',             label:'MFA Security',          icon:Shield },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
  readonly: [
    { id:'overview',        label:'Dashboard',             icon:LayoutDashboard },
    { id:'reports',         label:'Reports',               icon:FileText },
    { id:'schools',         label:'Schools',               icon:School },
    { id:'analytics',       label:'Analytics',             icon:BarChart3 },
    { section:'Account' },
    { id:'profile',         label:'My Profile',            icon:User },
    { id:'password',        label:'Change Password',       icon:Lock },
  ],
};

const TIER_GRADIENTS = {
  national: 'from-[#0d1117] to-[#1a1a2e]',
  regional: 'from-[#1e3a5f] to-[#142d4c]',
  district: 'from-[#15493B] to-[#0f3329]',
  school:   'from-[#2d4a22] to-[#1e3317]',
};
const TIER_BADGE = { national:'National Level', regional:'Regional Level', district:'District Level', school:'School Level' };

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active?'bg-amber text-ink shadow-sm':'text-stone-200 hover:bg-white/10 hover:text-white'}`}>
      <Icon className="w-4 h-4 flex-shrink-0"/>
      <span className="truncate text-left leading-tight">{label}</span>
    </button>
  );
}

export default function Shell({ children, view, onNavigate }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const items    = NAV[user.role] || NAV.readonly;
  const tier     = ROLE_TIER(user.role);
  const gradient = TIER_GRADIENTS[tier] || TIER_GRADIENTS.district;
  const avatarSrc= user?.profile_picture ? `${BASE}${user.profile_picture}` : null;
  const initials = (user?.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const sidebar = (
    <aside className={`flex flex-col h-full bg-gradient-to-b ${gradient}`}>
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 bg-amber rounded-lg flex items-center justify-center flex-shrink-0">
            <Landmark className="w-4 h-4 text-white"/>
          </div>
          <div>
            <div className="text-[8px] font-bold tracking-widest text-amber uppercase">Republic of Ghana</div>
            <div className="text-xs font-semibold text-white leading-tight">School Feeding Programme</div>
          </div>
        </div>
        <div className="text-[8px] font-bold tracking-[0.2em] text-white/20 uppercase mt-1">{TIER_BADGE[tier]}</div>
      </div>
      {/* User */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <button onClick={()=>onNavigate('profile')} className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border border-white/20 hover:border-amber/50 transition-all">
            {avatarSrc
              ? <img src={avatarSrc} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full bg-white/20 flex items-center justify-center"><span className="text-xs font-bold text-white">{initials}</span></div>}
          </button>
          <div className="min-w-0">
            <div className="text-[9px] text-white/40">{ROLE_LABELS[user.role]}</div>
            <div className="text-sm font-semibold text-white truncate">{user.name}</div>
            {user.title&&<div className="text-[9px] text-amber/60 italic truncate leading-tight">{user.title}</div>}
            {user.mfa_enabled&&<div className="text-[9px] text-emerald/70 flex items-center gap-0.5 mt-0.5"><Shield className="w-2.5 h-2.5"/>MFA</div>}
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {items.map((item,i) =>
          item.section
            ? <div key={i} className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20 px-3 pt-3 pb-1">{item.section}</div>
            : <NavItem key={item.id} icon={item.icon} label={item.label} active={view===item.id}
                onClick={()=>{ onNavigate(item.id); setOpen(false); }}/>
        )}
      </nav>
      {/* Sign out */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10">
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:bg-white/10 hover:text-white transition-all">
          <LogOut className="w-4 h-4"/><span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-paper flex">
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0 fixed inset-y-0 left-0 z-30 shadow-xl">{sidebar}</div>
      {open&&<div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={()=>setOpen(false)}/>}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col shadow-2xl transform transition-transform duration-300 lg:hidden ${open?'translate-x-0':'-translate-x-full'}`}>{sidebar}</div>
      <div className="flex-1 lg:ml-64 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={()=>setOpen(true)} className="p-2 rounded-lg hover:bg-stone-100"><Menu className="w-5 h-5"/></button>
          <span className="font-semibold text-sm text-ink">GSFP</span>
          <div className="w-9"/>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-screen-2xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
