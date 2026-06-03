import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import Shell from './components/layout/Shell';
import { ROLE_TIER } from './utils/format';
import ChatbotWidget from './components/chatbot/ChatbotWidget';

// National
import ExecutiveDashboard  from './components/national/ExecutiveDashboard';
import NationalDashboard   from './components/national/NationalDashboard';
import NationalAnalytics   from './components/national/NationalAnalytics';
import NationalReportsHub  from './components/national/NationalReportsHub';
import NationalFinance     from './components/national/NationalFinance';
import DisbursementPortal  from './components/national/DisbursementPortal';
import SystemConfig        from './components/national/SystemConfig';
// Regional
import RegionalDashboard   from './components/regional/RegionalDashboard';
// District
import DistrictDashboard   from './components/district/DistrictDashboard';
// School
import CatererDashboard    from './components/caterer/CatererDashboard';
import HeadmasterDashboard from './components/headmaster/HeadmasterDashboard';
// Shared
import RegionsManager      from './components/shared/RegionsManager';
import DistrictManager     from './components/shared/DistrictManager';
import SchoolsManager      from './components/shared/SchoolsManager';
import UniversalUserManager from './components/shared/UniversalUserManager';
import FinancePortal       from './components/shared/FinancePortal';
import ReportsView         from './components/shared/ReportsView';
import PaymentsView        from './components/shared/PaymentsView';
import MessagingCenter     from './components/shared/MessagingCenter';
import AnalyticsDashboard  from './components/shared/AnalyticsDashboard';
import AuditLog            from './components/shared/AuditLog';
import BulkUploadPortal    from './components/shared/BulkUploadPortal';
import PasswordManager     from './components/shared/PasswordManager';
import ProfilePage         from './components/shared/ProfilePage';
// Chatbot & Security
import { AdminChatbotPanel } from './components/chatbot/AdminChatbotPanel';
import AgentMonitor        from './components/security/AgentMonitor';
import MFASetup            from './components/security/MFASetup';
// Workflow
import DCEDashboard        from './components/workflow/DCEDashboard';
import OfficialReportsHub  from './components/workflow/OfficialReportsHub';
// Specialised dashboards
import FinanceDashboard    from './components/finance/FinanceDashboard';
import MonitoringDashboard from './components/monitoring/MonitoringDashboard';
import AuditDashboard      from './components/audit/AuditDashboard';
import DataEntryDashboard  from './components/dataentry/DataEntryDashboard';

const EXECUTIVE_ROLES = ['ceo','national_director'];
const NATIONAL_ROLES  = ['super_admin','national_admin','national_finance'];
const FINANCE_ROLES   = ['national_finance','regional_finance','finance_officer'];
const AUDIT_ROLES     = ['auditor','regional_auditor','national_auditor'];
const MONITOR_ROLES   = ['monitoring_officer','regional_monitoring','national_monitoring'];

function AppContent() {
  const { user } = useAuth();
  const [view, setView] = useState('overview');
  if (!user) return <LoginScreen/>;

  const tier     = ROLE_TIER(user.role);
  const isExec   = EXECUTIVE_ROLES.includes(user.role);
  const isNat    = NATIONAL_ROLES.includes(user.role);
  const isReg    = tier === 'regional';
  const navigate = v => setView(v);

  const renderView = () => {
    switch (view) {
      case 'overview':
        if (isExec)                            return <ExecutiveDashboard onNavigate={navigate}/>;
        if (isNat)                             return <NationalDashboard onNavigate={navigate}/>;
        if (isReg)                             return <RegionalDashboard onNavigate={navigate}/>;
        if (user.role==='caterer')             return <CatererDashboard view="overview"/>;
        if (user.role==='headmaster')          return <HeadmasterDashboard view="overview"/>;
        if (user.role==='dce')                 return <DCEDashboard/>;
        if (FINANCE_ROLES.includes(user.role)) return <FinanceDashboard onNavigate={navigate}/>;
        if (AUDIT_ROLES.includes(user.role))   return <AuditDashboard onNavigate={navigate}/>;
        if (MONITOR_ROLES.includes(user.role)) return <MonitoringDashboard onNavigate={navigate}/>;
        if (user.role==='data_entry')          return <DataEntryDashboard/>;
        return <DistrictDashboard/>;
      // National
      case 'natanalytics':     return <NationalAnalytics/>;
      case 'natreports':       return <NationalReportsHub/>;
      case 'natfinance':       return <NationalFinance/>;
      case 'disbursements':    return <DisbursementPortal/>;
      case 'sysconfig':        return <SystemConfig/>;
      // Security
      case 'chatbot-admin':    return <AdminChatbotPanel/>;
      case 'agents':           return <AgentMonitor/>;
      case 'mfa':              return <MFASetup/>;
      // Workflow
      case 'dce-approvals':    return <DCEDashboard/>;
      case 'official-reports': return <OfficialReportsHub/>;
      // Specialised
      case 'finance-dash':     return <FinanceDashboard onNavigate={navigate}/>;
      case 'audit-analysis':   return <AuditDashboard onNavigate={navigate}/>;
      case 'monitoring':       return <MonitoringDashboard onNavigate={navigate}/>;
      // Shared
      case 'regions':          return <RegionsManager/>;
      case 'districts':        return <DistrictManager/>;
      case 'schools':          return <SchoolsManager/>;
      case 'users':            return <UniversalUserManager/>;
      case 'finance':          return <FinancePortal/>;
      case 'reports':          return <ReportsView/>;
      case 'payments':
        if (user.role==='caterer') return <CatererDashboard view="payments"/>;
        return <PaymentsView/>;
      case 'analytics':        return <AnalyticsDashboard/>;
      case 'messages':         return <MessagingCenter/>;
      case 'audit':            return <AuditLog/>;
      case 'bulk-upload':      return <BulkUploadPortal/>;
      case 'password':         return <PasswordManager/>;
      case 'profile':          return <ProfilePage/>;
      // School
      case 'submit':           return <CatererDashboard view="submit"/>;
      case 'history':
        if (user.role==='caterer')    return <CatererDashboard view="history"/>;
        if (user.role==='headmaster') return <HeadmasterDashboard view="history"/>;
        return <ReportsView/>;
      case 'pending':          return <HeadmasterDashboard view="pending"/>;
      default:
        if (isExec) return <ExecutiveDashboard onNavigate={navigate}/>;
        if (isNat)  return <NationalDashboard onNavigate={navigate}/>;
        return <DistrictDashboard/>;
    }
  };

  return (
    <>
      <Shell view={view} onNavigate={navigate}>{renderView()}</Shell>
      <ChatbotWidget/>
    </>
  );
}

export default function App() {
  return <AuthProvider><AppContent/></AuthProvider>;
}
