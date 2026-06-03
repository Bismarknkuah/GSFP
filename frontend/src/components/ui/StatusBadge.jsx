import Pill from './Pill';
const MAP={pending:{tone:'amber',label:'Pending'},approved:{tone:'emerald',label:'Approved'},rejected:{tone:'rust',label:'Rejected'},'fully-paid':{tone:'emerald',label:'Fully Paid'},partial:{tone:'amber',label:'Partial'},arrears:{tone:'rust',label:'Arrears'},active:{tone:'emerald',label:'Active'},inactive:{tone:'rust',label:'Inactive'},draft:{tone:'stone',label:'Draft'}};
export default function StatusBadge({status}){const m=MAP[status]||{tone:'stone',label:status};return <Pill tone={m.tone}>{m.label}</Pill>;}
