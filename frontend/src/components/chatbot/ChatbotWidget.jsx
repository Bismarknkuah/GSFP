import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, RefreshCw, CheckCircle2, Star, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { fmtDateTime, ROLE_LABELS } from '../../utils/format';

const SUGGESTIONS = [
  'How do I submit a feeding report?',
  'What is the payment rate per pupil?',
  'How are arrears calculated?',
  'How do I export reports to PDF?',
  'What happens if my report is rejected?',
  'How do I change my password?',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-forest"/>
      </div>
      <div className="bg-stone-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center">
          <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
          <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
          <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
        </div>
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const { user } = useAuth();
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState('');
  const [messages,setMessages]= useState([]);
  const [sessionId,setSession]= useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [unread,  setUnread]  = useState(0);
  const bottomRef = useRef();
  const inputRef  = useRef();

  // Welcome message
  useEffect(()=>{
    if (messages.length===0) {
      setMessages([{
        role:'assistant', id:'welcome',
        content:`Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm the GSFP Assistant.\n\nI can help you with:\n• Feeding reports and submissions\n• Payment queries and arrears\n• System navigation\n• Policy questions\n\nWhat can I help you with today?`,
        timestamp: new Date().toISOString(),
        source:'welcome',
      }]);
    }
  },[]);

  useEffect(()=>{
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior:'smooth' });
  },[messages,loading]);

  useEffect(()=>{
    if (open) { setUnread(0); setTimeout(()=>inputRef.current?.focus(),100); }
  },[open]);

  const send = async (msg) => {
    const text = (msg || input).trim();
    if (!text) return;
    setInput(''); setError(null);
    setMessages(m=>[...m,{ role:'user', id:Date.now()+'u', content:text, timestamp:new Date().toISOString() }]);
    setLoading(true);
    try {
      if (!api.chatbot || !api.chatbot.chat) throw new Error('Chatbot service unavailable');
      const r = await api.chatbot.chat(text, sessionId);
      if (!sessionId && r.session_id) setSession(r.session_id);
      setMessages(m=>[...m,{ role:'assistant', id:Date.now()+'a', content:r.reply, timestamp:new Date().toISOString(), source:r.source, faq_id:r.faq_id }]);
      if (!open) setUnread(n=>n+1);
    } catch(e) {
      setError(e.message);
      setMessages(m=>[...m,{ role:'assistant', id:Date.now()+'err', content:'Sorry, I encountered an error. Please try again.', timestamp:new Date().toISOString(), source:'error' }]);
    } finally { setLoading(false); }
  };

  const reset = ()=>{ setMessages([]); setSession(null); setInput(''); setTimeout(()=>{ setMessages([{role:'assistant',id:'w2',content:`Chat cleared. How can I help you?`,timestamp:new Date().toISOString(),source:'welcome'}]); },100); };

  const SourceBadge = ({source}) => {
    if (!source||source==='welcome') return null;
    const map = { faq:['FAQ Database','bg-emerald/10 text-emerald'], ai:['AI Generated','bg-blue-50 text-blue-600'], escalated:['Admin Notified','bg-amber/10 text-amber'], error:['Error','bg-rust/10 text-rust'] };
    const [label,cls] = map[source]||['',''];
    if (!label) return null;
    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-5 right-5 z-50">
        {!open && unread>0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-rust text-white text-xs font-bold rounded-full flex items-center justify-center z-10">{unread}</div>}
        <button onClick={()=>setOpen(!open)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{background:'linear-gradient(135deg,#15493B,#1a5c49)'}}>
          {open ? <X className="w-6 h-6 text-white"/> : <MessageSquare className="w-6 h-6 text-white"/>}
        </button>
      </div>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-96 max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-stone-200" style={{height:'520px'}}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{background:'linear-gradient(135deg,#0d1b2a,#15493B)'}}>
            <div className="w-9 h-9 bg-amber rounded-xl flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">GSFP Assistant</div>
              <div className="text-[10px] text-white/50">AI-powered · Ghana School Feeding Programme</div>
            </div>
            <div className="flex gap-1">
              <button onClick={reset} className="p-1.5 hover:bg-white/10 rounded-lg" title="Clear chat"><RefreshCw className="w-3.5 h-3.5 text-white/60"/></button>
              <button onClick={()=>setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-3.5 h-3.5 text-white/60"/></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.map(msg=>(
              <div key={msg.id} className={`flex items-end gap-2 ${msg.role==='user'?'flex-row-reverse':''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role==='user'?'bg-forest text-white':'bg-forest/10'}`}>
                  {msg.role==='user'?<User className="w-3.5 h-3.5"/>:<Bot className="w-4 h-4 text-forest"/>}
                </div>
                <div className={`max-w-[78%] ${msg.role==='user'?'items-end':'items-start'} flex flex-col gap-1`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.role==='user'?'bg-forest text-white rounded-br-sm':'bg-stone-100 text-stone-800 rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[9px] text-stone-300">{msg.timestamp?new Date(msg.timestamp).toLocaleTimeString('en-GH',{hour:'2-digit',minute:'2-digit'}):''}</span>
                    {msg.source && <SourceBadge source={msg.source}/>}
                  </div>
                </div>
              </div>
            ))}
            {loading && <TypingIndicator/>}
            {error && (
              <div className="flex items-center gap-2 text-xs text-rust bg-rust/10 rounded-xl px-3 py-2"><AlertCircle className="w-3 h-3 flex-shrink-0"/>{error}</div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Suggestions (when no conversation) */}
          {messages.length<=1 && !loading && (
            <div className="px-4 py-2 flex-shrink-0 bg-white border-t border-stone-50">
              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mb-2">Common questions</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.slice(0,4).map(s=>(
                  <button key={s} onClick={()=>send(s)}
                    className="text-xs bg-stone-50 hover:bg-forest/10 hover:text-forest border border-stone-200 rounded-full px-2.5 py-1 transition-colors text-stone-600">
                    {s.length>35?s.slice(0,35)+'...':s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 px-4 py-3 bg-white border-t border-stone-100 flex-shrink-0">
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder="Ask anything about GSFP..."
              className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 bg-white"/>
            <button onClick={()=>send()} disabled={loading||!input.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-forest disabled:opacity-40 hover:bg-[#0f3329] transition-colors flex-shrink-0">
              {loading?<RefreshCw className="w-4 h-4 text-white animate-spin"/>:<Send className="w-4 h-4 text-white"/>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
