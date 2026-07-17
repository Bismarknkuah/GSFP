export const fmtDate = (iso) => {
  if (!iso) return '--';
  try { return new Date(iso.slice(0,10)+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return iso; }
};

export const fmtDateTime = (iso) => {
  if (!iso) return '--';
  try { return new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch { return iso; }
};

export const fmtNum = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString('en-GH');
};

export const cedis = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '--';
  return 'GHS ' + num.toLocaleString('en-GH',{minimumFractionDigits:2,maximumFractionDigits:2});
};

export const ROLE_LABELS = {
  // Executive
  ceo:                  'Chief Executive Officer',
  national_director:    'National Coordinating Director',
  // National
  super_admin:          'Super Administrator',
  national_admin:       'National Administrator',
  national_finance:     'National Finance Officer',
  national_auditor:     'National Auditor',
  national_monitoring:  'National Monitoring Officer',
  // Regional
  regional_minister:    'Regional Minister',
  regional_coordinator: 'Regional Feeding Coordinator',
  regional_admin:       'Regional Administrator',
  regional_finance:     'Regional Finance Officer',
  regional_auditor:     'Regional Auditor',
  regional_monitoring:  'Regional Monitoring Officer',
  // District
  district_director:    'District Director',
  dce:                  'District Chief Executive',
  district_coordinator: 'District Feeding Coordinator',
  district_admin:       'District Administrator',
  finance_officer:      'Finance Officer',
  auditor:              'District Auditor',
  monitoring_officer:   'District M&E Officer',
  data_entry:           'Data Entry Officer',
  // School
  headmaster:           'Headmaster',
  caterer:              'Caterer',
  // Legacy
  admin:                'System Admin',
  dfc:                  'DFC',
  mp:                   'Member of Parliament',
  readonly:             'Read-Only',
};

export const ROLE_BADGE = ROLE_LABELS;

export const STATUS_COLORS = {
  approved:          'emerald',
  pending:           'amber',
  rejected:          'rust',
  partial:           'amber',
  'fully-paid':      'emerald',
  arrears:           'rust',
  pending_district:  'amber',
  pending_regional:  'amber',
  pending_national:  'amber',
  dual_approved:     'emerald',
  executed:          'stone',
};

export const today = () => new Date().toISOString().split('T')[0];

export const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

export const ROLE_TIER = (role) => {
  if (['ceo','national_director','super_admin','national_admin',
       'national_finance','national_auditor','national_monitoring'].includes(role)) return 'national';
  if ((role||'').startsWith('regional_') || role==='regional_minister') return 'regional';
  if (['district_director','dce','district_coordinator','district_admin',
       'finance_officer','auditor','monitoring_officer','data_entry'].includes(role)) return 'district';
  return 'school';
};

export const GHANA_REGIONS = [
  'Greater Accra','Ashanti','Western','Western North','Eastern','Central',
  'Volta','Oti','Northern','Savannah','North East','Upper East',
  'Upper West','Bono','Bono East','Ahafo',
];