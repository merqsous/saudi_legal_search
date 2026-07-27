'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Loader2, User } from 'lucide-react';

interface ChatMessage {
  id: number;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ first_name: string; last_name: string; phone: string } | null>(null);

  // Chat state
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registration form (for non-authenticated users)
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken) setAuthToken(savedToken);
    if (savedUser) {
      try {
        setAuthUser(JSON.parse(savedUser));
      } catch {}
    }

    // Restore existing chat from sessionStorage
    const savedChatToken = sessionStorage.getItem('chat_token');
    if (savedChatToken) {
      setChatToken(savedChatToken);
      loadChat(savedChatToken);
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Poll for new messages when chat is open
  useEffect(() => {
    if (isOpen && chatToken) {
      pollRef.current = setInterval(() => loadChat(chatToken, true), 5000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, chatToken]);

  const loadChat = async (token: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/chat/${token}`);
      if (!res.ok) return;
      const data = await res.json();
      // Build messages: first message from ticket, then replies
      const allMsgs: ChatMessage[] = [
        { id: 0, message: data.ticket.message, is_admin: false, created_at: data.ticket.created_at },
        ...data.replies,
      ];
      setMessages(allMsgs);
    } catch {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim() || !firstName.trim() || !lastName.trim() || !firstMessage.trim()) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          message: firstMessage.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'فشل بدء المحادثة');
      }
      const data = await res.json();
      setChatToken(data.chat_token);
      sessionStorage.setItem('chat_token', data.chat_token);
      setMessages([{ id: 0, message: firstMessage.trim(), is_admin: false, created_at: new Date().toISOString() }]);
      setFirstMessage('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل بدء المحادثة');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatToken) return;
    setSending(true);
    try {
      // Optimistic update
      setMessages(prev => [...prev, { id: Date.now(), message: inputText.trim(), is_admin: false, created_at: new Date().toISOString() }]);
      const text = inputText.trim();
      setInputText('');

      await fetch(`${API_BASE}/api/support/chat/${chatToken}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
    } catch {
      setError('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dt: string) => {
    try {
      return new Date(dt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const hasChat = chatToken !== null;
  const isRegistered = authToken !== null && authUser !== null;

  // Don't render on admin and support pages
  if (pathname === '/admin' || pathname === '/support') {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 left-5 z-50 flex items-center gap-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all px-4 py-3 group"
          aria-label="محادثة دعم"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-sm font-bold max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
            محادثة جديدة
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-5 left-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-bold text-sm">الدعم الفني</h3>
                <p className="text-xs text-primary-100">سنرد عليك خلال 24 ساعة</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 min-h-[200px]">
            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-xs text-center">
                {error}
              </div>
            )}

            {!hasChat ? (
              /* Registration / Start chat form */
              <div>
                {!isRegistered && (
                  <div className="mb-4 text-center">
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium">ابدأ محادثة جديدة</p>
                    <p className="text-xs text-slate-400 mt-1">أدخل بياناتك لنبدأ المحادثة</p>
                  </div>
                )}

                {isRegistered && (
                  <div className="mb-4 text-center">
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium">مرحباً {authUser?.first_name}</p>
                    <p className="text-xs text-slate-400 mt-1">اكتب رسالتك وسنرد عليك</p>
                  </div>
                )}

                <form onSubmit={handleStartChat} className="space-y-3">
                  {!isRegistered && (
                    <>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="الاسم الأول"
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-primary-500"
                      />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="الاسم الأخير"
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-primary-500"
                      />
                      <input
                        type="text"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="رقم الجوال (05XXXXXXXX)"
                        dir="ltr"
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-primary-500 text-right"
                      />
                    </>
                  )}
                  <textarea
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    placeholder="اكتب رسالتك هنا..."
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-primary-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    بدء المحادثة
                  </button>
                </form>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : (
              /* Messages list */
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id + '-' + idx}
                    className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-3 text-sm leading-relaxed ${
                        msg.is_admin
                          ? 'bg-primary-50 border border-primary-200 text-slate-800'
                          : 'bg-primary-600 text-white'
                      }`}
                    >
                      {msg.is_admin && (
                        <p className="text-xs font-bold text-primary-700 mb-1">فريق الدعم</p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.is_admin ? 'text-slate-400' : 'text-primary-100'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar (only when chat exists) */}
          {hasChat && (
            <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white flex-shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب رسالة..."
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="flex items-center justify-center w-9 h-9 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
