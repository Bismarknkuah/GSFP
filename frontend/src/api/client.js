const BASE = import.meta.env.VITE_BACKEND_URL || '';
const KEY  = 'gsfp.token';
export const token = {
  get:   ()  => localStorage.getItem(KEY),
  set:   (t) => { t ? localStorage.setItem(KEY,t) : localStorage.removeItem(KEY); },
  clear: ()  => localStorage.removeItem(KEY),
};
class ApiError extends Error { constructor(msg,status,data){super(msg);this.status=status;this.data=data;} }
async function req(path,{method='GET',body,form}={}) {
  const h={Accept:'application/json'};
  const t=token.get(); if(t) h.Authorization=`Bearer ${t}`;
  let payload=null;
  if(form){payload=form;}
  else if(body!==undefined){h['Content-Type']='application/json';payload=JSON.stringify(body);}
  let res;
  try{res=await fetch(BASE+path,{method,headers:h,body:payload});}
  catch{throw new ApiError('Network unreachable — check backend is running',0,null);}
  const isJson=(res.headers.get('content-type')||'').includes('json');
  const data=isJson?await res.json().catch(()=>null):null;
  if(!res.ok) throw new ApiError(data?.error||`Error ${res.status}`,res.status,data);
  return data;
}
const qs=(p={})=>{const e=Object.entries(p).filter(([,v])=>v!=null&&v!=='');return e.length?'?'+e.map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&'):'';};

export const api = {
  auth:{
    login:(u,p)=>req('/api/auth/login',{method:'POST',body:{username:u,password:p}}),
    me:()=>req('/api/auth/me'),
  },
  password:{
    change:(cur,nw)=>req('/api/password/change',{method:'POST',body:{currentPassword:cur,newPassword:nw}}),
    forgot:(username,name)=>req('/api/password/forgot',{method:'POST',body:{username,name}}),
    adminReset:(userId,newPassword)=>req(`/api/password/admin-reset/${userId}`,{method:'POST',body:{newPassword}}),
    generateTemp:(userId)=>req(`/api/password/generate-temp/${userId}`,{method:'POST'}),
  },
  regions:{
    list:(p={})=>req('/api/regions'+qs(p)),
    ghana:()=>req('/api/regions/ghana'),
    create:(d)=>req('/api/regions',{method:'POST',body:d}),
    update:(id,d)=>req(`/api/regions/${id}`,{method:'PATCH',body:d}),
  },
  districts:{
    list:(p={})=>req('/api/districts'+qs(p)),
    create:(d)=>req('/api/districts',{method:'POST',body:d}),
    update:(id,d)=>req(`/api/districts/${id}`,{method:'PATCH',body:d}),
    remove:(id)=>req(`/api/districts/${id}`,{method:'DELETE'}),
  },
  users:{
    list:(p={})=>req('/api/users'+qs(p)),
    get:(id)=>req(`/api/users/${id}`),
    roles:()=>req('/api/users/roles'),
    create:(d)=>req('/api/users',{method:'POST',body:d}),
    update:(id,d)=>req(`/api/users/${id}`,{method:'PATCH',body:d}),
    remove:(id)=>req(`/api/users/${id}`,{method:'DELETE'}),
    deactivate:(id)=>req(`/api/users/${id}/deactivate`,{method:'POST'}),
    reactivate:(id)=>req(`/api/users/${id}/reactivate`,{method:'POST'}),
  },
  schools:{
    list:(p={})=>req('/api/schools'+qs(p)),
    get:(id)=>req(`/api/schools/${id}`),
    create:(d)=>req('/api/schools',{method:'POST',body:d}),
    update:(id,d)=>req(`/api/schools/${id}`,{method:'PATCH',body:d}),
    remove:(id)=>req(`/api/schools/${id}`,{method:'DELETE'}),
  },
  reports:{
    list:(p={})=>req('/api/reports'+qs(p)),
    create:(fields,photo)=>{const fd=new FormData();Object.entries(fields).forEach(([k,v])=>v!=null&&fd.append(k,v));if(photo)fd.append('photo',photo);return req('/api/reports',{method:'POST',form:fd});},
    review:(id,decision,comment)=>req(`/api/reports/${id}/review`,{method:'PATCH',body:{decision,comment}}),
    regionalReview:(id,decision,comment)=>req(`/api/reports/${id}/regional-review`,{method:'PATCH',body:{decision,comment}}),
  },
  payments:{
    list:(p={})=>req('/api/payments'+qs(p)),
    summary:()=>req('/api/payments/summary'),
    create:(d)=>req('/api/payments',{method:'POST',body:d}),
    update:(id,d)=>req(`/api/payments/${id}`,{method:'PATCH',body:d}),
    selfReport:(d)=>req('/api/payments/self-report',{method:'POST',body:d}),
  },
  finance:{
    summary:()=>req('/api/finance/summary'),
    budgets:(p={})=>req('/api/finance/budgets'+qs(p)),
    createBudget:(d)=>req('/api/finance/budgets',{method:'POST',body:d}),
    allocations:(p={})=>req('/api/finance/allocations'+qs(p)),
    createAllocation:(d)=>req('/api/finance/allocations',{method:'POST',body:d}),
    approveAllocation:(id)=>req(`/api/finance/allocations/${id}/approve`,{method:'POST'}),
  },
  disbursements:{
    list:(p={})=>req('/api/disbursements'+qs(p)),
    get:(id)=>req(`/api/disbursements/${id}`),
    annualSummary:(p={})=>req('/api/disbursements/annual-summary'+qs(p)),
    create:(d)=>req('/api/disbursements',{method:'POST',body:d}),
    ceoApprove:(id,comment)=>req(`/api/disbursements/${id}/ceo-approve`,{method:'POST',body:{comment}}),
    ceoReject:(id,comment)=>req(`/api/disbursements/${id}/ceo-reject`,{method:'POST',body:{comment}}),
    execute:(id,ref)=>req(`/api/disbursements/${id}/execute`,{method:'POST',body:{disbursement_reference:ref}}),
  },
  bulk:{
    downloadTemplate:()=>BASE+'/api/bulk/template',
    uploadPayments:(file)=>{const fd=new FormData();fd.append('file',file);return req('/api/bulk/payments',{method:'POST',form:fd});},
    paymentSummary:(p={})=>req('/api/bulk/payment-summary'+qs(p)),
  },
  analytics:{
    overview:()=>req('/api/analytics/overview'),
    monthly:()=>req('/api/analytics/monthly'),
    caterers:()=>req('/api/analytics/caterers'),
    regional:(id)=>req(`/api/analytics/regional/${id}`),
    national:()=>req('/api/analytics/national'),
  },
  messages:{
    list:()=>req('/api/messages'),
    send:(d)=>req('/api/messages',{method:'POST',body:d}),
    markRead:(id)=>req(`/api/messages/${id}/read`,{method:'POST'}),
    markAllRead:()=>req('/api/messages/read-all',{method:'POST'}),
    users:(p={})=>req('/api/messages/users'+qs(p)),
  },
  chatbot:{
    chat:(message,sessionId)=>req('/api/chatbot/chat',{method:'POST',body:{message,session_id:sessionId}}),
    getSession:(id)=>req(`/api/chatbot/session/${id}`),
    faq:{
      list:()=>req('/api/chatbot/faq'),
      create:(d)=>req('/api/chatbot/faq',{method:'POST',body:d}),
      update:(id,d)=>req(`/api/chatbot/faq/${id}`,{method:'PATCH',body:d}),
      remove:(id)=>req(`/api/chatbot/faq/${id}`,{method:'DELETE'}),
    },
    pending:{
      list:(p={})=>req('/api/chatbot/pending'+qs(p)),
      answer:(id,d)=>req(`/api/chatbot/pending/${id}/answer`,{method:'POST',body:d}),
      dismiss:(id)=>req(`/api/chatbot/pending/${id}/dismiss`,{method:'POST'}),
    },
    stats:()=>req('/api/chatbot/stats'),
  },
  officialReports:{
    list:(p={})=>req('/api/official-reports'+qs(p)),
    get:(id)=>req(`/api/official-reports/${id}`),
    stats:()=>req('/api/official-reports/stats'),
    submit:(d)=>req('/api/official-reports',{method:'POST',body:d}),
    action:(id,d)=>req(`/api/official-reports/${id}/action`,{method:'POST',body:d}),
  },
  mfa:{
    status:()=>req('/api/mfa/status'),
    setup:(method)=>req('/api/mfa/setup',{method:'POST',body:{method}}),
    sendOTP:()=>req('/api/mfa/send-otp',{method:'POST'}),
    verify:(otp)=>req('/api/mfa/verify',{method:'POST',body:{otp}}),
    disable:()=>req('/api/mfa/disable',{method:'POST'}),
  },
  notifApi:{
    test:(d)=>req('/api/notifications/test',{method:'POST',body:d}),
    logs:()=>req('/api/notifications/logs'),
    vapidKey:()=>req('/api/notifications/vapid-key'),
  },
  agents:{
    list:()=>req('/api/agents/list'),
    stats:()=>req('/api/agents/stats'),
    run:(agentType)=>req('/api/agents/run',{method:'POST',body:{agentType}}),
    alerts:(p={})=>req('/api/agents/alerts'+qs(p)),
    runs:()=>req('/api/agents/runs'),
    acknowledge:(id)=>req(`/api/agents/alerts/${id}/acknowledge`,{method:'POST'}),
    resolve:(id,note)=>req(`/api/agents/alerts/${id}/resolve`,{method:'POST',body:{resolution_note:note}}),
  },
  ghanaCard:{
    stats:()=>req('/api/ghana-card/stats'),
    all:(p={})=>req('/api/ghana-card/all'+qs(p)),
    getStatus:(userId)=>req(`/api/ghana-card/${userId}`),
    submit:(d)=>req('/api/ghana-card/submit',{method:'POST',body:d}),
    adminVerify:(userId,note)=>req(`/api/ghana-card/admin-verify/${userId}`,{method:'POST',body:{note}}),
    adminReject:(userId,reason)=>req(`/api/ghana-card/admin-reject/${userId}`,{method:'POST',body:{reason}}),
  },
  audit:{
    list:(p={})=>req('/api/audit'+qs(p)).catch(()=>({entries:[]})),
  },
  notifications:{
    list:()=>req('/api/notifications'),
    readAll:()=>req('/api/notifications/read-all',{method:'POST'}),
  },
};
export {ApiError};
