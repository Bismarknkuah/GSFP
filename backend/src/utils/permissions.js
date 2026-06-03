const ROLES = [
  'ceo','national_director','super_admin','national_admin','national_finance',
  'national_auditor','national_monitoring',
  'regional_minister','regional_coordinator','regional_admin','regional_finance','regional_auditor','regional_monitoring',
  'district_director','dce','district_coordinator','district_admin','finance_officer',
  'auditor','monitoring_officer','caterer','headmaster','data_entry','readonly',
];

const PERMS = {
  ceo:                  ['*'],
  national_director:    ['*'],
  super_admin:          ['*'],
  national_admin:       ['users:manage','regions:manage','districts:manage','schools:manage','reports:read','analytics:national','messages:broadcast','config:manage','audit:read'],
  national_finance:     ['finance:national','payments:manage','budgets:manage','allocations:manage','reports:read','analytics:finance'],
  national_auditor:     ['audit:*','reports:*','payments:read','finance:read','analytics:national','official_reports:read'],
  national_monitoring:  ['reports:read','analytics:national','monitoring:national','official_reports:read'],
  regional_minister:    ['regions:read','districts:read','reports:read','analytics:regional','messages:regional','official_reports:approve'],
  regional_coordinator: ['districts:manage','schools:manage','reports:manage','payments:regional','caterers:manage','messages:regional','analytics:regional','official_reports:manage'],
  regional_admin:       ['districts:read','users:create','reports:read','schools:read','messages:read'],
  regional_finance:     ['payments:regional','finance:regional','reports:read','allocations:read','official_reports:finance'],
  regional_auditor:     ['audit:regional','reports:read','payments:read','analytics:regional','official_reports:audit'],
  regional_monitoring:  ['reports:read','analytics:regional','monitoring:regional','official_reports:read'],
  district_director:    ['schools:manage','caterers:manage','reports:manage','payments:district','users:manage','messages:all','analytics:district'],
  dce:                  ['official_reports:approve','reports:read','schools:read','analytics:district','messages:district','payments:read'],
  district_coordinator: ['schools:manage','caterers:manage','reports:submit','payments:request','messages:exec','analytics:district','official_reports:submit'],
  district_admin:       ['schools:read','users:create','reports:read','messages:read'],
  finance_officer:      ['payments:district','finance:district','reports:read','official_reports:submit'],
  auditor:              ['audit:district','reports:read','payments:read','official_reports:submit'],
  monitoring_officer:   ['reports:read','schools:read','analytics:district','monitoring:district','official_reports:submit'],
  caterer:              ['reports:own','payments:own','messages:exec'],
  headmaster:           ['reports:approve','schools:own','messages:read'],
  data_entry:           ['reports:submit','schools:read'],
  readonly:             ['reports:read','schools:read','analytics:read'],
};

function can(role,perm){
  const p=PERMS[role]||[];
  if(p.includes('*'))return true;
  if(p.includes(perm))return true;
  return p.some(r=>r.endsWith(':*')?perm.startsWith(r.slice(0,-2)+':'):false);
}

const NATIONAL_ROLES=['ceo','national_director','super_admin','national_admin','national_finance','national_auditor','national_monitoring'];
const REGIONAL_ROLES=['regional_minister','regional_coordinator','regional_admin','regional_finance','regional_auditor','regional_monitoring'];
const DISTRICT_ROLES=['district_director','dce','district_coordinator','district_admin','finance_officer','auditor','monitoring_officer','data_entry'];
const SCHOOL_ROLES=['caterer','headmaster'];

const ROLE_LABELS={
  ceo:'Chief Executive Officer', national_director:'National Coordinating Director',
  super_admin:'Super Administrator', national_admin:'National Administrator',
  national_finance:'National Finance Officer', national_auditor:'National Auditor',
  national_monitoring:'National Monitoring Officer',
  regional_minister:'Regional Minister', regional_coordinator:'Regional Feeding Coordinator',
  regional_admin:'Regional Administrator', regional_finance:'Regional Finance Officer',
  regional_auditor:'Regional Auditor', regional_monitoring:'Regional Monitoring Officer',
  district_director:'District Director', dce:'District Chief Executive',
  district_coordinator:'District Feeding Coordinator', district_admin:'District Administrator',
  finance_officer:'Finance Officer', auditor:'District Auditor',
  monitoring_officer:'District M&E Officer',
  caterer:'Caterer', headmaster:'Headmaster', data_entry:'Data Entry Officer', readonly:'Read-Only',
};

const GHANA_REGIONS=[
  {name:'Greater Accra',capital:'Accra',code:'GAR'},{name:'Ashanti',capital:'Kumasi',code:'ASH'},
  {name:'Western',capital:'Takoradi',code:'WES'},{name:'Western North',capital:'Sefwi Wiawso',code:'WNR'},
  {name:'Eastern',capital:'Koforidua',code:'EAS'},{name:'Central',capital:'Cape Coast',code:'CEN'},
  {name:'Volta',capital:'Ho',code:'VOL'},{name:'Oti',capital:'Dambai',code:'OTI'},
  {name:'Northern',capital:'Tamale',code:'NOR'},{name:'Savannah',capital:'Damongo',code:'SAV'},
  {name:'North East',capital:'Nalerigu',code:'NER'},{name:'Upper East',capital:'Bolgatanga',code:'UPE'},
  {name:'Upper West',capital:'Wa',code:'UPW'},{name:'Bono',capital:'Sunyani',code:'BON'},
  {name:'Bono East',capital:'Techiman',code:'BOE'},{name:'Ahafo',capital:'Goaso',code:'AHF'},
];

module.exports={ROLES,PERMS,can,ROLE_LABELS,NATIONAL_ROLES,REGIONAL_ROLES,DISTRICT_ROLES,SCHOOL_ROLES,GHANA_REGIONS};
