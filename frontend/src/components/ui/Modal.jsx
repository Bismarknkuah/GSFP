import { X } from 'lucide-react';
const SIZES={sm:'max-w-md',md:'max-w-lg',lg:'max-w-2xl',xl:'max-w-4xl'};
export default function Modal({open,onClose,title,children,size='md'}){
  if(!open)return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/><div className={`relative bg-white rounded-2xl shadow-2xl w-full ${SIZES[size]} max-h-[90vh] overflow-y-auto`}><div className="flex items-center justify-between px-6 py-4 border-b border-stone-100"><h2 className="font-serif text-xl font-semibold text-ink">{title}</h2><button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg"><X className="w-4 h-4"/></button></div><div className="px-6 py-5">{children}</div></div></div>;
}
