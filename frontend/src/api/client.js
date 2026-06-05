const BASE = import.meta.env.VITE_BACKEND_URL || '';
const KEY  = 'gsfp.token';

export const token = {
  get:   ()  => localStorage.getItem(KEY),
  set:   (t) => { t ? localStorage.setItem(KEY,t) : localStorage.removeItem(KEY); },
  clear: ()  => localStorage.removeItem(KEY),
};

class ApiError extends Error {
  constructor(msg, status, data) { super(msg); this.status=status; this.data=data; }
}

async function req(path, { method='GET', body, form }={}) {
  const h = { Accept:'application/json' };
  const t = token.get(); if (t) h.Authorization = `Bearer ${t}`;
  let payload = null;
  if (form) { payload = form; }
  else if (body !== undefined) { h['Content-Type']='application/json'; payload=JSON.stringify(body); }
  let res;
  try { res = await fetch(BASE+path, { method, headers:h, body:payload }); }
  catch { throw new ApiError('Network unreachable — check backend is running', 0, null); }
  const isJson = (res.headers.get('content-type')||'').includes('json');
  const data   = isJson ? await res.json().catch(()=>null) : null;
  if (!res.ok) throw new ApiError(data?.error||`Error ${res.status}`, res.status, data);
  return data;
}

const get   = (path, params={}) => req(path + qs(params));
const post  = (path, body)       => req(path, { method:'POST',   body });
const patch = (path, body)       => req(path, { method:'PATCH',  body });
const put   = (path, body)       => req(path, { method:'PUT',    body });
const del   = (path)             => req(path, { method:'DELETE' });
const qs    = (p={}) => {
  const e = Object.entries(p).filter(([,v]) => v!=null && v!=='');
  return e.length ? '?'+e.map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&') : '';
};

export const api = {

  // ── Auth ──────────────────────────────────────────────────────
  auth: {
    login:   (u,p) => post('/api/auth/login', { username:u, password:p }),
    me:      ()    => get('/api/auth/me'),
    refresh: ()    => post('/api/auth/refresh'),
    logout:  ()    => post('/api/auth/logout'),
  },

  // ── Password ──────────────────────────────────────────────────
  password: {
    change:       (cur,nw)         => post('/api/password/change',            { currentPassword:cur, newPassword:nw }),
    forgot:       (username,name)  => post('/api/password/forgot',            { username, name }),
    adminReset:   (userId,newPwd)  => post(`/api/password/admin-reset/${userId}`,  { newPassword:newPwd }),
    generateTemp: (userId)         => post(`/api/password/generate-temp/${userId}`),
  },

  // ── Regions ───────────────────────────────────────────────────
  regions: {
    list:   (p={}) => get('/api/regions', p),
    get:    (id)   => get(`/api/regions/${id}`),
    ghana:  ()     => get('/api/regions/ghana'),
    create: (d)    => post('/api/regions', d),
    update: (id,d) => patch(`/api/regions/${id}`, d),
    remove: (id)   => del(`/api/regions/${id}`),
  },

  // ── Districts ─────────────────────────────────────────────────
  districts: {
    list:   (p={}) => get('/api/districts', p),
    get:    (id)   => get(`/api/districts/${id}`),
    create: (d)    => post('/api/districts', d),
    update: (id,d) => patch(`/api/districts/${id}`, d),
    remove: (id)   => del(`/api/districts/${id}`),
  },

  // ── Schools ───────────────────────────────────────────────────
  schools: {
    list:            (p={})      => get('/api/schools', p),
    get:             (id)        => get(`/api/schools/${id}`),
    getByHeadmaster: (hId)       => get('/api/schools', { headmaster_id:hId }),
    getByDistrict:   (dId)       => get('/api/schools', { district_id:dId }),
    create:          (d)         => post('/api/schools', d),
    update:          (id,d)      => patch(`/api/schools/${id}`, d),
    remove:          (id)        => del(`/api/schools/${id}`),
    updateEnrolled:  (id,n)      => patch(`/api/schools/${id}`, { enrolled:n }),
  },

  // ── Users ─────────────────────────────────────────────────────
  users: {
    list:          (p={})    => get('/api/users', p),
    get:           (id)      => get(`/api/users/${id}`),
    roles:         ()        => get('/api/users/roles'),
    create:        (d)       => post('/api/users', d),
    update:        (id,d)    => patch(`/api/users/${id}`, d),
    remove:        (id)      => del(`/api/users/${id}`),
    deactivate:    (id)      => post(`/api/users/${id}/deactivate`),
    reactivate:    (id)      => post(`/api/users/${id}/reactivate`),
    updateProfile: (id,form) => req(`/api/users/${id}/profile`, { method:'PATCH', form }),
  },

  // ── Reports ───────────────────────────────────────────────────
  reports: {
    list:           (p={})          => get('/api/reports', p),
    listPending:    ()              => get('/api/reports/pending'),
    listBySchool:   (schoolId,p={}) => get('/api/reports', { school_id:schoolId, ...p }),
    listByDate:     (date)          => get('/api/reports', { date }),
    get:            (id)            => get(`/api/reports/${id}`),
    create:         (fields, photo) => {
      const fd = new FormData();
      Object.entries(fields).forEach(([k,v]) => v!=null && fd.append(k,String(v)));
      if (photo) fd.append('photo', photo);
      return req('/api/reports', { method:'POST', form:fd });
    },
    review:         (id,d)          => patch(`/api/reports/${id}/review`, d),
    regionalReview: (id,dec,cmt)    => patch(`/api/reports/${id}/regional-review`, { decision:dec, comment:cmt }),
    export:         (p={})          => get('/api/reports/export', p),
  },

  // ── Payments ──────────────────────────────────────────────────
  payments: {
    list:       (p={}) => get('/api/payments', p),
    get:        (id)   => get(`/api/payments/${id}`),
    summary:    ()     => get('/api/payments/summary'),
    arrears:    (p={}) => get('/api/payments/arrears', p),
    create:     (d)    => post('/api/payments', d),
    update:     (id,d) => patch(`/api/payments/${id}`, d),
    selfReport: (d)    => post('/api/payments/self-report', d),
    export:     (p={}) => get('/api/payments/export', p),
  },

  // ── Finance ───────────────────────────────────────────────────
  finance: {
    summary:           ()     => get('/api/finance/summary'),
    budgets:           (p={}) => get('/api/finance/budgets', p),
    createBudget:      (d)    => post('/api/finance/budgets', d),
    updateBudget:      (id,d) => patch(`/api/finance/budgets/${id}`, d),
    allocations:       (p={}) => get('/api/finance/allocations', p),
    createAllocation:  (d)    => post('/api/finance/allocations', d),
    approveAllocation: (id)   => post(`/api/finance/allocations/${id}/approve`),
    rejectAllocation:  (id,reason) => post(`/api/finance/allocations/${id}/reject`, { reason }),
  },

  // ── Disbursements ─────────────────────────────────────────────
  disbursements: {
    list:          (p={})       => get('/api/disbursements', p),
    get:           (id)         => get(`/api/disbursements/${id}`),
    annualSummary: (p={})       => get('/api/disbursements/annual-summary', p),
    stats:         ()           => get('/api/disbursements/stats'),
    create:        (d)          => post('/api/disbursements', d),
    update:        (id,d)       => patch(`/api/disbursements/${id}`, d),
    ceoApprove:    (id,comment) => post(`/api/disbursements/${id}/ceo-approve`, { comment }),
    ceoReject:     (id,comment) => post(`/api/disbursements/${id}/ceo-reject`,  { comment }),
    execute:       (id,ref)     => post(`/api/disbursements/${id}/execute`, { disbursement_reference:ref }),
  },

  // ── Bulk Upload ───────────────────────────────────────────────
  bulk: {
    downloadTemplate: ()     => BASE+'/api/bulk/template',
    uploadPayments:   (file) => { const fd=new FormData(); fd.append('file',file); return req('/api/bulk/payments',{method:'POST',form:fd}); },
    uploadReports:    (file) => { const fd=new FormData(); fd.append('file',file); return req('/api/bulk/reports',{method:'POST',form:fd}); },
    paymentSummary:   (p={}) => get('/api/bulk/payment-summary', p),
  },

  // ── Analytics ─────────────────────────────────────────────────
  analytics: {
    overview:  ()    => get('/api/analytics/overview'),
    monthly:   ()    => get('/api/analytics/monthly'),
    caterers:  ()    => get('/api/analytics/caterers'),
    schools:   (p={})=> get('/api/analytics/schools', p),
    regional:  (id)  => get(`/api/analytics/regional/${id}`),
    national:  ()    => get('/api/analytics/national'),
    district:  (id)  => get(`/api/analytics/district/${id}`),
    compliance:(p={})=> get('/api/analytics/compliance', p),
  },

  // ── Messages ──────────────────────────────────────────────────
  messages: {
    list:        (p={}) => get('/api/messages', p),
    get:         (id)   => get(`/api/messages/${id}`),
    send:        (d)    => post('/api/messages', d),
    markRead:    (id)   => post(`/api/messages/${id}/read`),
    markAllRead: ()     => post('/api/messages/read-all'),
    users:       (p={}) => get('/api/messages/users', p),
    delete:      (id)   => del(`/api/messages/${id}`),
  },

  // ── Chatbot ───────────────────────────────────────────────────
  chatbot: {
    chat:       (message, sessionId) => post('/api/chatbot/chat', { message, session_id:sessionId }),
    getSession: (id)                 => get(`/api/chatbot/session/${id}`),
    history:    (sessionId)          => get(`/api/chatbot/history/${sessionId}`),
    stats:      ()                   => get('/api/chatbot/stats'),
    faq: {
      list:   (p={}) => get('/api/chatbot/faq', p),
      get:    (id)   => get(`/api/chatbot/faq/${id}`),
      create: (d)    => post('/api/chatbot/faq', d),
      update: (id,d) => patch(`/api/chatbot/faq/${id}`, d),
      remove: (id)   => del(`/api/chatbot/faq/${id}`),
    },
    pending: {
      list:    (p={}) => get('/api/chatbot/pending', p),
      answer:  (id,d) => post(`/api/chatbot/pending/${id}/answer`, d),
      dismiss: (id)   => post(`/api/chatbot/pending/${id}/dismiss`),
    },
  },

  // ── Official Reports ──────────────────────────────────────────
  officialReports: {
    list:   (p={}) => get('/api/official-reports', p),
    get:    (id)   => get(`/api/official-reports/${id}`),
    stats:  ()     => get('/api/official-reports/stats'),
    submit: (d)    => post('/api/official-reports', d),
    action: (id,d) => post(`/api/official-reports/${id}/action`, d),
  },

  // ── MFA ───────────────────────────────────────────────────────
  mfa: {
    status:  ()       => get('/api/mfa/status'),
    setup:   (method) => post('/api/mfa/setup', { method }),
    sendOTP: ()       => post('/api/mfa/send-otp'),
    verify:  (otp)    => post('/api/mfa/verify', { otp }),
    disable: ()       => post('/api/mfa/disable'),
  },

  // ── AI Agents ─────────────────────────────────────────────────
  agents: {
    list:        ()          => get('/api/agents/list'),
    stats:       ()          => get('/api/agents/stats'),
    run:         (agentType) => post('/api/agents/run', { agentType }),
    alerts:      (p={})      => get('/api/agents/alerts', p),
    runs:        (p={})      => get('/api/agents/runs', p),
    acknowledge: (id)        => post(`/api/agents/alerts/${id}/acknowledge`),
    resolve:     (id,note)   => post(`/api/agents/alerts/${id}/resolve`, { resolution_note:note }),
    dismiss:     (id)        => post(`/api/agents/alerts/${id}/dismiss`),
  },

  // ── Ghana Card ────────────────────────────────────────────────
  ghanaCard: {
    stats:       ()              => get('/api/ghana-card/stats'),
    all:         (p={})          => get('/api/ghana-card/all', p),
    getStatus:   (userId)        => get(`/api/ghana-card/${userId}`),
    submit:      (d)             => post('/api/ghana-card/submit', d),
    adminVerify: (userId,note)   => post(`/api/ghana-card/admin-verify/${userId}`, { note }),
    adminReject: (userId,reason) => post(`/api/ghana-card/admin-reject/${userId}`, { reason }),
  },

  // ── Audit ─────────────────────────────────────────────────────
  audit: {
    list:   (p={}) => get('/api/audit', p).catch(()=>({ entries:[] })),
    export: (p={}) => get('/api/audit/export', p).catch(()=>null),
  },

  // ── Notifications ─────────────────────────────────────────────
  notifications: {
    list:    (p={}) => get('/api/notifications', p),
    readAll: ()     => post('/api/notifications/read-all'),
    delete:  (id)   => del(`/api/notifications/${id}`),
  },

  // ── Notification API (admin) ──────────────────────────────────
  notifApi: {
    test:     (d) => post('/api/notifications/test', d),
    logs:     ()  => get('/api/notifications/logs'),
    vapidKey: ()  => get('/api/notifications/vapid-key'),
  },

  // ── Enrollment Update Workflow ─────────────────────────────────
  enrollment: {
    list:          (p={}) => get('/api/enrollment', p),
    listPending:   ()     => get('/api/enrollment', { status:'pending' }),
    get:           (id)   => get(`/api/enrollment/${id}`),
    submit:        (d)    => post('/api/enrollment', d),
    review:        (id,d) => post(`/api/enrollment/${id}/review`, d),
    approve:       (id,comment) => post(`/api/enrollment/${id}/review`, { action:'approved', comment }),
    reject:        (id,comment) => post(`/api/enrollment/${id}/review`, { action:'rejected', comment }),
  },

};

export { ApiError };