'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2, Trash2, Bot, User } from 'lucide-react';

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export default function ChatPanel({ caseId, authToken }: { caseId: string; authToken: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authToken) return;
    fetch(`/api/cases/${caseId}/chat`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [caseId, authToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !authToken) return;
    setSending(true);
    setAiNotice(null);
    setInput('');

    // Optimistic user message
    const tempId = -Date.now();
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: text, created_at: new Date().toISOString() }]);

    try {
      const res = await fetch(`/api/cases/${caseId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل الإرسال');
      if (data.ai_unavailable) {
        setAiNotice('الخدمة الذكية غير متاحة مؤقتاً — تم حفظ رسالتك وسيتم الرد عليها عند توفر الخدمة.');
      }
      // Replace optimistic message with server response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        ...data.messages,
      ]);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
      setAiNotice(e instanceof Error ? e.message : 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    if (!authToken || !confirm('هل تريد مسح محادثة المساعد لهذه القضية؟')) return;
    setMessages([]);
    try {
      await fetch(`/api/cases/${caseId}/chat`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;
      const isHeading = /^#{1,4}\s/.test(trimmed);
      const clean = trimmed.replace(/^#{1,4}\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1');
      if (isHeading) {
        return (
          <p key={i} className="font-bold text-primary-900 text-sm mt-2 mb-1" dir="rtl">
            {clean}
          </p>
        );
      }
      return (
        <p key={i} className="text-sm leading-relaxed mb-1" dir="rtl">
          {clean}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-slate-900">المساعد الذكي</h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500"
            title="مسح المحادثة"
          >
            <Trash2 className="w-3.5 h-3.5" />
            مسح
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4">
        اسأل عن أي شيء يخص هذه القضية — المساعد يعرف تفاصيل القضية وجلساتها ويمكنه البحث في قاعدة الأحكام السعودية
      </p>

      {/* Messages */}
      <div className="max-h-96 overflow-y-auto space-y-3 mb-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
        {!loaded ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-2">ابدأ بطرح سؤال عن القضية</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['ما هي نقاط القوة في هذه القضية؟', 'ابحث عن أحكام مشابهة', 'لخص الجلسات القادمة'].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-primary-300 hover:text-primary-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user' ? 'bg-primary-600' : 'bg-emerald-100'
                }`}
              >
                {m.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div
                className={`rounded-xl px-3.5 py-2.5 max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 rounded-tl-none'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="rtl">{m.content}</p>
                ) : (
                  renderContent(m.content)
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {aiNotice && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-xs">{aiNotice}</div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="اكتب سؤالك عن القضية..."
          disabled={sending}
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          dir="rtl"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
