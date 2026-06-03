export default function Button({children,onClick,variant='primary',size='md',icon:Icon,type='button',disabled=false,className=''}){
  const base='inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const sz={sm:'px-3 py-1.5 text-xs',md:'px-4 py-2.5 text-sm',lg:'px-6 py-3 text-base'}[size];
  const v={primary:'bg-forest text-white hover:bg-forest/90 shadow-sm',secondary:'bg-cream text-forest border border-stone-200 hover:bg-stone-100',ghost:'text-stone-600 hover:bg-stone-100',danger:'bg-rust text-white hover:bg-rust/90',amber:'bg-amber text-white hover:bg-amber/90'}[variant];
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sz} ${v} ${className}`}>{Icon&&<Icon className="w-4 h-4"/>}{children}</button>;
}
