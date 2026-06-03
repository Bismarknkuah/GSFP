require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connect, isSeeded } = require('./index');
const Region       = require('../models/Region');
const District     = require('../models/District');
const School       = require('../models/School');
const User         = require('../models/User');
const Report       = require('../models/Report');
const Payment      = require('../models/Payment');
const Budget       = require('../models/Budget');
const Allocation   = require('../models/Allocation');
const Message      = require('../models/Message');
const Notification = require('../models/Notification');
const AuditLog        = require('../models/AuditLog');
const FAQ             = require('../models/FAQ');
const ChatSession     = require('../models/ChatSession');
const PendingQuestion = require('../models/PendingQuestion');
const { GHANA_REGIONS } = require('../utils/permissions');
const { newId, nowISO, daysAgoISO, todayISO } = require('../utils/ids');
const h = pw => bcrypt.hashSync(pw, 10);

async function seed({ force=false }={}) {
  await connect();
  if (!force && await isSeeded()) { console.log('[seed] Already seeded. Use --force to wipe.'); return; }
  if (force) {
    console.log('[seed] Wiping all collections...');
    await Promise.all([Region,District,School,User,Report,Payment,Budget,Allocation,Message,Notification,AuditLog,FAQ,ChatSession,PendingQuestion,require('../models/Disbursement')].map(M=>M.deleteMany({})));
  }

  // ── Regions ──────────────────────────────────────────────────
  const regions = GHANA_REGIONS.map((r,i) => ({
    _id: `rgn-${r.code.toLowerCase()}`, code: r.code, name: r.name,
    capital: r.capital, active: true, created_at: nowISO(),
    coordinator_id: null, minister_id: null,
  }));
  await Region.insertMany(regions);
  const WNR = regions.find(r=>r.code==='WNR')._id;
  const GAR = regions.find(r=>r.code==='GAR')._id;
  const ASH = regions.find(r=>r.code==='ASH')._id;

  // ── Districts ─────────────────────────────────────────────────
  const districts = [
    { _id:'dst-akt', code:'WNR-AKT', name:'Sefwi Akontombra', region_id:WNR, capital:'Akontombra', active:true, created_at:nowISO() },
    { _id:'dst-bia', code:'WNR-BIA', name:'Bia West',          region_id:WNR, capital:'Essam',       active:true, created_at:nowISO() },
    { _id:'dst-sub', code:'WNR-SUB', name:'Suaman',            region_id:WNR, capital:'Dadieso',     active:true, created_at:nowISO() },
    { _id:'dst-acc', code:'GAR-ACC', name:'Accra Metro',        region_id:GAR, capital:'Accra',       active:true, created_at:nowISO() },
    { _id:'dst-kum', code:'ASH-KUM', name:'Kumasi Metro',       region_id:ASH, capital:'Kumasi',      active:true, created_at:nowISO() },
  ];
  await District.insertMany(districts);

  // ── Users ─────────────────────────────────────────────────────
  const users = [
    // Executive
    // Executive
    { _id:'usr-ceo',     username:'ceo',           password_hash:h('ceo123'),    role:'ceo',               name:'H.E. Dr. Nana Kwame Asante',    title:'Chief Executive Officer, GSFP',           region_id:null, district_id:null, school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-natdir',  username:'natdirector',   password_hash:h('natdir123'), role:'national_director', name:'Dr. Abena Frimpong-Boateng',     title:'National Coordinating Director, GSFP',    region_id:null, district_id:null, school_id:null, active:true, created_at:nowISO() },
    // National Staff
    { _id:'usr-super',  username:'superadmin',   password_hash:h('super123'),  role:'super_admin',         name:'Dr. Kwame Mensah Boateng',      title:'Super Administrator', region_id:null, district_id:null, school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-natadm', username:'nationaladmin', password_hash:h('natadm123'), role:'national_admin',      name:'Mrs. Abena Acheampong',          title:'National Administrator, GSFP', region_id:null, district_id:null, school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-natfin', username:'nationalfin',   password_hash:h('natfin123'), role:'national_finance',    name:'Mr. Kofi Asante',               title:'National Finance Officer', region_id:null, district_id:null, school_id:null, active:true, created_at:nowISO() },
    // Regional
    { _id:'usr-regmin', username:'regionalmin',   password_hash:h('regmin123'), role:'regional_minister',   name:'Hon. Eric Opoku',               title:'Regional Minister, Western North', region_id:WNR, district_id:null, school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-nataud',  username:'nationalauditor', password_hash:h('nataud123'), role:'national_auditor',  name:'Mr. Kweku Mensah-Bonsu', title:'National Auditor, GSFP', region_id:null, district_id:null, school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-natmon',  username:'nationalmon',   password_hash:h('natmon123'), role:'national_monitoring',name:'Mrs. Akua Sarpong-Oti',  title:'National M&E Officer, GSFP', region_id:null, district_id:null, school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-regcoo', username:'regionalcoo',   password_hash:h('regcoo123'), role:'regional_coordinator',name:'Mrs. Cecilia Dapaah',           title:'Regional Feeding Coordinator, Western North', region_id:WNR, district_id:null, school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-regfin', username:'regionalfin',   password_hash:h('regfin123'), role:'regional_finance',    name:'Mr. Samuel Ofori-Boateng',      title:'Regional Finance Officer', region_id:WNR, district_id:null, school_id:null, active:true, created_at:nowISO() },
    // District
    { _id:'usr-dirdct', username:'director',      password_hash:h('dir123'),   role:'district_director',   name:'Mr. Emmanuel Asomani',           title:'District Director, Sefwi Akontombra', region_id:WNR, district_id:'dst-akt', school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-dfc',    username:'coordinator',   password_hash:h('coord123'), role:'district_coordinator',name:'Mr. Joseph Owusu-Bempah',        title:'District Feeding Coordinator', region_id:WNR, district_id:'dst-akt', school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-dce',    username:'dce',           password_hash:h('dce123'),   role:'district_coordinator',name:'Hon. Joseph Appiah',             title:'District Chief Executive', region_id:WNR, district_id:'dst-akt', school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-mp',     username:'mp',            password_hash:h('mp123'),    role:'district_coordinator',name:'Hon. Pious Kwame Nkuah',         title:'Member of Parliament', region_id:WNR, district_id:'dst-akt', school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-fin',    username:'financeofficer',password_hash:h('fin123'),   role:'finance_officer',     name:'Mrs. Grace Asante',              title:'Finance Officer', region_id:WNR, district_id:'dst-akt', school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-aud',    username:'auditor1',      password_hash:h('aud123'),   role:'auditor',             name:'Mr. Daniel Asamoah',             title:'District Auditor', region_id:WNR, district_id:'dst-akt', school_id:null, active:true, created_at:nowISO() },
    { _id:'usr-mno',    username:'monitoring1',   password_hash:h('mno123'),   role:'monitoring_officer',  name:'Miss Joyce Antwi',               title:'M&E Officer', region_id:WNR, district_id:'dst-akt', school_id:null, active:true, created_at:nowISO() },
    // Headmasters
    ...[1,2,3,4,5,6,7,8].map(i=>({ _id:`usr-h00${i}`, username:`head${i}`, password_hash:h('head123'), role:'headmaster', name:`Headmaster ${i}`, title:null, region_id:WNR, district_id:'dst-akt', school_id:`sch-00${i}`, active:true, created_at:nowISO() })),
    // Caterers
    ...[1,2,3,4,5,6,7,8].map(i=>({ _id:`usr-c00${i}`, username:`caterer${i}`, password_hash:h('cat123'), role:'caterer', name:`Caterer ${i}`, title:null, region_id:WNR, district_id:'dst-akt', school_id:`sch-00${i}`, rate_per_student:2.00, active:true, created_at:nowISO() })),
  ];

  const headNames = ['Mr. Samuel Appiah','Mrs. Grace Boateng','Mr. Daniel Mensah','Mrs. Comfort Asare','Mr. Emmanuel Donkor','Mrs. Rebecca Acheampong','Mr. Joseph Ofori','Mrs. Vivian Asantewaa'];
  const catNames  = ['Madam Akosua Mensah','Madam Yaa Asantewaa','Madam Adwoa Frimpong','Madam Esi Quainoo','Madam Ama Serwaa','Madam Abena Pokuaa','Madam Nana Yaa Konadu','Madam Afia Kobi'];
  for (let i=1;i<=8;i++) {
    const hu = users.find(u=>u._id===`usr-h00${i}`); if(hu) hu.name=headNames[i-1];
    const cu = users.find(u=>u._id===`usr-c00${i}`); if(cu) cu.name=catNames[i-1];
  }
  await User.insertMany(users);

  // ── Schools ───────────────────────────────────────────────────
  const schoolData = [
    ['sch-001','AKT-001','Akontombra D/A Basic School','Akontombra',412],
    ['sch-002','AKT-002','Asempaneye Methodist Primary','Asempaneye',287],
    ['sch-003','AKT-003','Boako R/C Primary School','Boako',356],
    ['sch-004','AKT-004','Kojina D/A Basic School','Kojina',198],
    ['sch-005','AKT-005','Tanoso Presby Primary','Tanoso',245],
    ['sch-006','AKT-006','Adjokrom D/A Primary','Adjokrom',312],
    ['sch-007','AKT-007','Ntakam Anglican Basic','Ntakam',178],
    ['sch-008','AKT-008','Sefwi-Asantekrom Methodist','Asantekrom',401],
  ];
  const schools = schoolData.map(([id,code,name,town,enrolled],i)=>({
    _id:id, code, name, town, district_id:'dst-akt', region_id:WNR,
    enrolled, headmaster_id:`usr-h00${i+1}`, caterer_id:`usr-c00${i+1}`, caterer2_id:null,
    active:true, created_at:daysAgoISO(120-i*5),
  }));
  await School.insertMany(schools);

  // ── Reports ───────────────────────────────────────────────────
  const foods=['Jollof Rice with Chicken','Banku with Okro Stew','Waakye with Fish and Egg','Kenkey with Fried Fish','Yam with Palaver Sauce','Rice and Stew with Egg','Beans Stew with Gari','Tuo Zaafi with Ayoyo Soup'];
  const reports=[];
  for(let d=0;d<30;d++){
    for(let i=1;i<=8;i++){
      if(Math.random()<0.1) continue;
      const sc=schools[i-1];
      const fed=Math.max(80,Math.min(sc.enrolled,sc.enrolled-10+Math.floor((Math.random()-0.5)*30)));
      const status=d<2?'pending':Math.random()<0.9?'approved':'rejected';
      reports.push({
        _id:newId('rep'), caterer_id:`usr-c00${i}`, school_id:sc._id,
        district_id:'dst-akt', region_id:WNR,
        date:daysAgoISO(d), food_type:foods[(d+i)%foods.length], students_fed:fed,
        time_ready:`${10+Math.floor(Math.random()*2)}:30`, time_served:`${12+Math.floor(Math.random()*2)}:00`,
        notes:null, image_path:null, status,
        headmaster_comment:status==='approved'?'Verified.':status==='rejected'?'Please resubmit.':null,
        reviewed_by:status!=='pending'?`usr-h00${i}`:null,
        reviewed_at:status!=='pending'?daysAgoISO(d)+'T14:00:00.000Z':null,
        regional_status:status==='approved'?'approved':null,
        forwarded:status==='approved', submitted_at:daysAgoISO(d)+'T13:00:00.000Z',
      });
    }
  }
  await Report.insertMany(reports);

  // ── Payments ──────────────────────────────────────────────────
  const payments=schools.map((sc,i)=>{
    const covered=60+i,paid=35+i*2,arrears=covered-paid,rate=1.20;
    return {
      _id:newId('pay'), caterer_id:`usr-c00${i+1}`, district_id:'dst-akt', region_id:WNR,
      period:'2025/2026 - Term 1', meals_served:covered*sc.enrolled, days_covered:covered,
      days_paid:paid, days_arrears:arrears, rate_per_student:rate,
      amount_paid:paid*sc.enrolled*rate, arrears_amount:arrears*sc.enrolled*rate,
      status:arrears===0?'fully-paid':'partial', last_payment_date:daysAgoISO(10+i*3),
      source:'National Government - GSFP', reference:`GSFP-2025T1-${String(i+1).padStart(4,'0')}`,
      caterer_reported:false, received_amount:paid*sc.enrolled*rate,
      co_approval_required:false, co_approved:true, visible_to_oversight:true,
      created_at:nowISO(),
    };
  });
  await Payment.insertMany(payments);

  // ── Budgets ───────────────────────────────────────────────────
  await Budget.insertMany([
    { _id:newId('bgt'), fiscal_year:'2025/2026', term:'Term 1', level:'national', region_id:null, district_id:null, total_amount:50000000, allocated:35000000, disbursed:28000000, balance:22000000, status:'active', created_by:'usr-natfin', created_at:nowISO() },
    { _id:newId('bgt'), fiscal_year:'2025/2026', term:'Term 1', level:'regional', region_id:WNR, district_id:null, total_amount:3200000, allocated:2100000, disbursed:1800000, balance:1400000, status:'active', created_by:'usr-regfin', created_at:nowISO() },
    { _id:newId('bgt'), fiscal_year:'2025/2026', term:'Term 1', level:'district', region_id:WNR, district_id:'dst-akt', total_amount:480000, allocated:380000, disbursed:310000, balance:170000, status:'active', created_by:'usr-fin', created_at:nowISO() },
  ]);

  // ── Messages ──────────────────────────────────────────────────
  await Message.insertMany([
    { _id:newId('msg'), sender_id:'usr-natadm', recipient:'BROADCAST_ALL', type:'circular', level:'national', subject:'2025/2026 Term 1 Guidelines', body:'All regional coordinators should ensure caterers submit daily reports on time. Compliance will be monitored at the national level.', priority:'high', timestamp:daysAgoISO(3)+'T09:00:00.000Z', read_by:[] },
    { _id:newId('msg'), sender_id:'usr-regcoo', recipient:'BROADCAST_DISTRICT', type:'broadcast', level:'regional', subject:'Payment Reminder', body:'All district coordinators: ensure payment records are updated before end of month.', priority:'normal', timestamp:daysAgoISO(1)+'T10:00:00.000Z', read_by:[] },
    { _id:newId('msg'), sender_id:'usr-dfc',    recipient:'usr-natadm', type:'direct', level:'district', subject:'Akontombra Term 1 Report', body:'Please find attached the Term 1 feeding report for Sefwi Akontombra District. All 8 schools achieved above 85% compliance.', priority:'normal', timestamp:daysAgoISO(2)+'T14:00:00.000Z', read_by:['usr-natadm'] },
  ]);

  await AuditLog.create({ _id:newId('aud'), timestamp:nowISO(), user_id:'system', user_name:'System', user_role:'system', action:'SYSTEM_INITIALIZED', target:'platform', details:'GSFP v2 seeded: 16 regions, 5 districts, 8 schools, 21+ users', level:'info' });

  console.log('[seed] Done:', { regions:regions.length, districts:districts.length, schools:schools.length, users:users.length, reports:reports.length, payments:payments.length });
  await seedFAQs();
  await seedDisbursements();
}

if (require.main===module) {
  seed({ force:process.argv.includes('--force') }).then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
}
module.exports = { seed };

async function seedFAQs() {
  const FAQ = require('../models/FAQ');
  const count = await FAQ.countDocuments();
  if (count > 0) return;
  const { nowISO } = require('../utils/ids');
  const now = nowISO();
  await FAQ.insertMany([
    { _id:'faq-001', question:'How much is the payment rate per pupil?', answer:'The current payment rate is GHS 2.00 (2 Ghana Cedis) per pupil per day. This rate is set by the National Government for the Ghana School Feeding Programme.', category:'payments', keywords:['rate','payment','cedis','pupil','day','ghs','amount'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-002', question:'How do I submit a daily feeding report?', answer:'To submit a daily report: 1) Click "Submit Report" in the left sidebar. 2) Select the food type served. 3) Enter the number of pupils fed. 4) Add the time food was ready and served. 5) Optionally upload a photo as evidence. 6) Click "Submit". Your headmaster will review and approve or reject it.', category:'reports', keywords:['submit','report','daily','feeding','how'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-003', question:'What happens if my report is rejected?', answer:'If your report is rejected by the headmaster, you will see a red alert on your dashboard showing the rejection reason. You can immediately resubmit a corrected report for the same day. The old rejected report is archived automatically. Your resubmission will appear as "resubmitted" in your history.', category:'reports', keywords:['rejected','resubmit','correction','headmaster','reject'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-004', question:'How do I change my password?', answer:'To change your password: 1) Look in the left sidebar under "Account" section. 2) Click "Change Password". 3) Enter your current password. 4) Enter your new password (minimum 6 characters). 5) Confirm the new password. 6) Click "Change password". Your password strength is shown as you type.', category:'account', keywords:['change','password','reset','account','security'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-005', question:'How do I upload a profile picture?', answer:'To add or change your profile picture: 1) Click "My Profile" in the sidebar under Account. 2) Click the camera icon on your current avatar. 3) Select an image from your device (JPG, PNG or WebP, max 5MB). 4) Click "Save profile". Your photo will appear in the sidebar immediately.', category:'account', keywords:['profile','picture','photo','avatar','upload'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-006', question:'How are arrears calculated?', answer:'Arrears are calculated as: Days Covered minus Days Paid. For example, if a caterer covered 60 days of feeding but only received payment for 45 days, the arrears are 15 days. In Ghana Cedis: 15 days × enrolled pupils × GHS 2.00 per pupil = total arrears owed.', category:'payments', keywords:['arrears','calculate','days','covered','paid','owed'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-007', question:'How do I export reports to PDF or Excel?', answer:'On any reports screen (Reports, Payments, Analytics), look for the "PDF" and "Excel" buttons in the top right area. Click PDF for a formatted document, or Excel for a spreadsheet. The export includes all visible records with your current filters applied. National users also get summaries and compliance data in the exports.', category:'reports', keywords:['export','pdf','excel','download','print'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-008', question:'How does bulk payment upload work?', answer:'Bulk upload allows coordinators and finance officers to upload bank payment data as a CSV file. To use it: 1) Go to "Bulk Upload" in the sidebar. 2) Download the CSV template. 3) Fill in your bank data (school_code, period, days_covered, days_paid, payment_date). 4) Upload the file. The system automatically creates or updates payment records at GHS 2.00 per pupil per day and calculates arrears.', category:'payments', keywords:['bulk','upload','csv','bank','payment','import'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-009', question:'Who approves feeding reports?', answer:'The approval chain is: 1) Caterer submits daily report. 2) Headmaster reviews and approves or rejects it. 3) Approved reports are forwarded to district level for oversight. 4) Regional Coordinator monitors regional compliance. 5) National Admin has full oversight. Each level can see all reports within their scope.', category:'workflow', keywords:['approve','approval','chain','workflow','headmaster','district','regional'], usage_count:0, created_by:'system', active:true, created_at:now },
    { _id:'faq-010', question:'How do I send a message to another user?', answer:'Go to "Messages" in the sidebar. Click "Compose". Choose your recipient: select a broadcast group (e.g. All Caterers, All Headmasters) or search for an individual by name. Set the priority level, add a subject and message body, then click "Send message". You can also reply to received messages.', category:'messages', keywords:['send','message','compose','broadcast','communicate'], usage_count:0, created_by:'system', active:true, created_at:now },
  ]);
  console.log('[seed] FAQs seeded: 10 initial Q&As');
}

async function seedDisbursements() {
  const Disbursement = require('../models/Disbursement');
  const count = await Disbursement.countDocuments();
  if (count > 0) return;
  const { nowISO, daysAgoISO, newId } = require('../utils/ids');
  const samples = [
    { _id:newId('dsb'), reference:'GSFP-DISB-TERM1-001', fiscal_year:'2025/2026', term:'Term 1', level:'regional', region_id:'rgn-wnr', recipient_name:'Western North Region Coordinator', amount:320000, purpose:'Term 1 caterer payments — Western North Region (8 districts)', payment_method:'Bank Transfer', bank_name:'Ghana Commercial Bank', status:'disbursed', created_by:'usr-natfin', created_by_name:'Mr. Kofi Asante', created_by_role:'national_finance', created_at:daysAgoISO(45)+'T09:00:00Z', ceo_id:'usr-ceo', ceo_name:'H.E. Dr. Nana Kwame Asante', ceo_decision_at:daysAgoISO(43)+'T14:00:00Z', ceo_comment:'Approved. Ensure all caterers receive payment promptly.', disbursed_by:'usr-natfin', disbursed_at:daysAgoISO(42)+'T10:00:00Z', disbursement_reference:'GCB-TXN-2025-001' },
    { _id:newId('dsb'), reference:'GSFP-DISB-TERM1-002', fiscal_year:'2025/2026', term:'Term 1', level:'regional', region_id:'rgn-ash', recipient_name:'Ashanti Region Coordinator', amount:850000, purpose:'Term 1 caterer payments — Ashanti Region (30 districts)', payment_method:'Bank Transfer', bank_name:'Ecobank Ghana', status:'ceo_approved', created_by:'usr-natfin', created_by_name:'Mr. Kofi Asante', created_by_role:'national_finance', created_at:daysAgoISO(10)+'T09:00:00Z', ceo_id:'usr-ceo', ceo_name:'H.E. Dr. Nana Kwame Asante', ceo_decision_at:daysAgoISO(8)+'T11:00:00Z', ceo_comment:'Approved pending final verification of caterer lists.' },
    { _id:newId('dsb'), reference:'GSFP-DISB-TERM1-003', fiscal_year:'2025/2026', term:'Term 1', level:'district', district_id:'dst-akt', recipient_name:'Sefwi Akontombra District Coordinator', amount:48000, purpose:'Term 1 supplementary payment — 8 schools', payment_method:'Mobile Money', bank_name:'MTN Mobile Money', status:'pending_ceo', created_by:'usr-natfin', created_by_name:'Mr. Kofi Asante', created_by_role:'national_finance', created_at:daysAgoISO(3)+'T14:00:00Z' },
    { _id:newId('dsb'), reference:'GSFP-DISB-SUPP-001', fiscal_year:'2025/2026', term:'Term 1', level:'district', district_id:'dst-acc', recipient_name:'Accra Metro District', amount:1200000, purpose:'Emergency supplementary feeding fund — Q4', payment_method:'Bank Transfer', bank_name:'GCB Bank', status:'ceo_rejected', created_by:'usr-natfin', created_by_name:'Mr. Kofi Asante', created_by_role:'national_finance', created_at:daysAgoISO(20)+'T10:00:00Z', ceo_id:'usr-ceo', ceo_name:'H.E. Dr. Nana Kwame Asante', ceo_decision_at:daysAgoISO(18)+'T09:00:00Z', ceo_comment:'Rejected: Amount exceeds approved budget for Q4. Please resubmit with revised figures and supporting documentation.' },
  ];
  await Disbursement.insertMany(samples);
  console.log('[seed] Disbursements seeded:', samples.length);
}
