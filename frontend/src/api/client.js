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
const post  = (path, body)       => req(path, { method:'POST', body });
const patch = (path, body)       => req(path, { method:'PATCH', body });
const del   = (path)             => req(path, { method:'DELETE' });
const qs    = (p={}) => {
  const e = Object.entries(p).filter(([,v]) => v!=null && v!=='');
  return e.length ? '?'+e.map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&') : '';
};

export const api = {

  // ── Auth ──────────────────────────────────────────────────────
  auth: {
    login: (u,p) => post('/api/auth/login', { username:u, password:p }),
    me:    ()    => get('/api/auth/me'),
  },

  // ── Password ──────────────────────────────────────────────────
  password: {
    change:       (cur,nw)          => post('/api/password/change', { currentPassword:cur, newPassword:nw }),
    forgot:       (username,name)   => post('/api/password/forgot', { username, name }),
    adminReset:   (userId,newPwd)   => post(`/api/password/admin-reset/${userId}`, { newPassword:newPwd }),
    generateTemp: (userId)          => post(`/api/password/generate-temp/${userId}`),
  },

  // ── Regions ───────────────────────────────────────────────────
  regions: {
    list:   (p={}) => get('/api/regions', p),
    ghana:  ()     => get('/api/regions/ghana'),
    create: (d)    => post('/api/regions', d),
    update: (id,d) => patch(`/api/regions/${id}`, d),
    remove: (id)   => del(`/api/regions/${id}`),
  },

  // ── Districts ─────────────────────────────────────────────────
  districts: {
    list:   (p={}) => get('/api/districts', p),
    create: (d)    => post('/api/districts', d),
    update: (id,d) => patch(`/api/districts/${id}`, d),
    remove: (id)   => del(`/api/districts/${id}`),
  },

  // ── Schools ───────────────────────────────────────────────────
  schools: {
    list:   (p={}) => get('/api/schools', p),
    get:    (id)   => get(`/api/schools/${id}`),
    create: (d)    => post('/api/schools', d),
    update: (id,d) => patch(`/api/schools/${id}`, d),
    remove: (id)   => del(`/api/schools/${id}`),
  },

  // ── Users ─────────────────────────────────────────────────────
  users: {
    list:       (p={}) => get('/api/users', p),
    get:        (id)   => get(`/api/users/${id}`),
    roles:      ()     => get('/api/users/roles'),
    create:     (d)    => post('/api/users', d),
    update:     (id,d) => patch(`/api/users/${id}`, d),
    remove:     (id)   => del(`/api/users/${id}`),
    deactivate: (id)   => post(`/api/users/${id}/deactivate`),
    reactivate: (id)   => post(`/api/users/${id}/reactivate`),
    updateProfile: (id,form) => req(`/api/users/${id}/profile`, { method:'PATCH', form }),
  },

  // ── Reports ───────────────────────────────────────────────────
  reports: {
    list:           (p={})           => get('/api/reports', p),
    listPending:    ()               => get('/api/reports/pending'),
    get:            (id)             => get(`/api/reports/${id}`),
    create:         (fields, photo)  => {
      const fd = new FormData();
      Object.entries(fields).forEach(([k,v]) => v!=null && fd.append(k,v));
      if (photo) fd.append('photo', photo);
      return req('/api/reports', { method:'POST', form:fd });
    },
    review:         (id,d)           => patch(`/api/reports/${id}/review`, d),
    regionalReview: (id,decision,comment) => patch(`/api/reports/${id}/regional-review`, { decision, comment }),
  },

  // ── Payments ──────────────────────────────────────────────────
  payments: {
    list:       (p={}) => get('/api/payments', p),
    summary:    ()     => get('/api/payments/summary'),
    create:     (d)    => post('/api/payments', d),
    update:     (id,d) => patch(`/api/payments/${id}`, d),
    selfReport: (d)    => post('/api/payments/self-report', d),
  },

  // ── Finance ───────────────────────────────────────────────────
  finance: {
    summary:          ()     => get('/api/finance/summary'),
    budgets:          (p={}) => get('/api/finance/budgets', p),
    createBudget:     (d)    => post('/api/finance/budgets', d),
    allocations:      (p={}) => get('/api/finance/allocations', p),
    createAllocation: (d)    => post('/api/finance/allocations', d),
    approveAllocation:(id)   => post(`/api/finance/allocations/${id}/approve`),
  },

  // ── Disbursements ─────────────────────────────────────────────
  disbursements: {
    list:          (p={})        => get('/api/disbursements', p),
    get:           (id)          => get(`/api/disbursements/${id}`),
    annualSummary: (p={})        => get('/api/disbursements/annual-summary', p),
    create:        (d)           => post('/api/disbursements', d),
    ceoApprove:    (id,comment)  => post(`/api/disbursements/${id}/ceo-approve`, { comment }),
    ceoReject:     (id,comment)  => post(`/api/disbursements/${id}/ceo-reject`, { comment }),
    execute:       (id,ref)      => post(`/api/disbursements/${id}/execute`, { disbursement_reference:ref }),
    stats:         ()            => get('/api/disbursements/stats'),
  },

  // ── Bulk Upload ───────────────────────────────────────────────
  bulk: {
    downloadTemplate: () => BASE+'/api/bulk/template',
    uploadPayments:   (file) => {
      const fd = new FormData(); fd.append('file', file);
      return req('/api/bulk/payments', { method:'POST', form:fd });
    },
    paymentSummary: (p={}) => get('/api/bulk/payment-summary', p),
  },

  // ── Analytics ─────────────────────────────────────────────────
  analytics: {
    overview:  ()   => get('/api/analytics/overview'),
    monthly:   ()   => get('/api/analytics/monthly'),
    caterers:  ()   => get('/api/analytics/caterers'),
    regional:  (id) => get(`/api/analytics/regional/${id}`),
    national:  ()   => get('/api/analytics/national'),
  },

  // ── Messages ──────────────────────────────────────────────────
  messages: {
    list:       ()   => get('/api/messages'),
    send:       (d)  => post('/api/messages', d),
    markRead:   (id) => post(`/api/messages/${id}/read`),
    markAllRead:()   => post('/api/messages/read-all'),
    users:      (p={})=>get('/api/messages/users', p),
  },

  // ── Chatbot ───────────────────────────────────────────────────
  chatbot: {
    chat:       (message, sessionId) => post('/api/chatbot/chat', { message, session_id:sessionId }),
    getSession: (id)                 => get(`/api/chatbot/session/${id}`),
    stats:      ()                   => get('/api/chatbot/stats'),
    faq: {
      list:   ()     => get('/api/chatbot/faq'),
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
    status:  ()        => get('/api/mfa/status'),
    setup:   (method)  => post('/api/mfa/setup', { method }),
    sendOTP: ()        => post('/api/mfa/send-otp'),
    verify:  (otp)     => post('/api/mfa/verify', { otp }),
    disable: ()        => post('/api/mfa/disable'),
  },

  // ── AI Agents ─────────────────────────────────────────────────
  agents: {
    list:        ()           => get('/api/agents/list'),
    stats:       ()           => get('/api/agents/stats'),
    run:         (agentType)  => post('/api/agents/run', { agentType }),
    alerts:      (p={})       => get('/api/agents/alerts', p),
    runs:        ()           => get('/api/agents/runs'),
    acknowledge: (id)         => post(`/api/agents/alerts/${id}/acknowledge`),
    resolve:     (id,note)    => post(`/api/agents/alerts/${id}/resolve`, { resolution_note:note }),
  },

  // ── Ghana Card ────────────────────────────────────────────────
  ghanaCard: {
    stats:       ()             => get('/api/ghana-card/stats'),
    all:         (p={})         => get('/api/ghana-card/all', p),
    getStatus:   (userId)       => get(`/api/ghana-card/${userId}`),
    submit:      (d)            => post('/api/ghana-card/submit', d),
    adminVerify: (userId,note)  => post(`/api/ghana-card/admin-verify/${userId}`, { note }),
    adminReject: (userId,reason)=> post(`/api/ghana-card/admin-reject/${userId}`, { reason }),
  },

  // ── Audit ─────────────────────────────────────────────────────
  audit: {
    list: (p={}) => get('/api/audit', p).catch(()=>({ entries:[] })),
  },

  // ── Notifications ─────────────────────────────────────────────
  notifications: {
    list:    () => get('/api/notifications'),
    readAll: () => post('/api/notifications/read-all'),
  },

  // ── Notification API (admin) ──────────────────────────────────
  notifApi: {
    test:    (d) => post('/api/notifications/test', d),
    logs:    ()  => get('/api/notifications/logs'),
    vapidKey:()  => get('/api/notifications/vapid-key'),
  },

};

export { ApiError };