'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Loader2, ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Header from '../components/Header';

interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Reply {
  id: number;
  message: string;
  is_admin: boolean;
  created_at: string;
}

interface TicketDetail extends Ticket {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function SupportPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) {
      router.push('/?signup=1');
      return;
    }
    setToken(savedToken);
    fetchTickets(savedToken);
  }, []);

  const fetchTickets = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        router.push('/?signup=1');
        return;
      }
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      setError('فشل تحميل التذاكر');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('الموضوع والرسالة مطلوبان');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'فشل إنشاء التذكرة');
      }
      setSubject('');
      setMessage('');
      setShowForm(false);
      setSuccess('تم إنشاء التذكرة بنجاح. سنرد عليك خلال 24 ساعة.');
      if (token) fetchTickets(token);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء التذكرة');
    } finally {
      setSubmitting(false);
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setTicketLoading(true);
    setSelectedTicket(null);
    try {
      const res = await fetch(`${API_BASE}/api/support/ticket/${ticket.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSelectedTicket(data.ticket);
      setReplies(data.replies || []);
    } catch {
      setError('فشل تحميل التذكرة');
    } finally {
      setTicketLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setReplyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/ticket/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (!res.ok) throw new Error('فشل إرسال الرد');
      setReplyText('');
      openTicket(selectedTicket);
    } catch {
      setError('فشل إرسال الرد');
    } finally {
      setReplyLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'open') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700"><Clock className="w-3 h-3" /> مفتوحة</span>;
    }
    if (status === 'answered') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700"><CheckCircle className="w-3 h-3" /> تم الرد</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">مغلقة</span>;
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return d;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">الدعم الفني</h1>
          <p className="text-slate-600">أرسل استفسارك وسنرد عليك خلال 24 ساعة</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {selectedTicket ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" /> رجوع للقائمة
            </button>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900">{selectedTicket.subject}</h2>
                {statusBadge(selectedTicket.status)}
              </div>
              <p className="text-sm text-slate-500 mb-3">{formatDate(selectedTicket.created_at)}</p>
              <div className="bg-slate-50 rounded-xl p-4 text-slate-700 leading-relaxed">
                {selectedTicket.message}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`rounded-xl p-4 ${reply.is_admin ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50 border border-slate-200'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${reply.is_admin ? 'text-primary-700' : 'text-slate-600'}`}>
                      {reply.is_admin ? 'فريق الدعم' : 'أنت'}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))}
            </div>

            {selectedTicket.status !== 'closed' && (
              <form onSubmit={handleReply}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب ردك..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 focus:outline-none focus:border-primary-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={replyLoading || !replyText.trim()}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {replyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  إرسال
                </button>
              </form>
            )}
          </div>
        ) : showForm ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" /> رجوع للقائمة
            </button>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">الموضوع</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: مشكلة في البحث، استفسار عن الاشتراك..."
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">الرسالة</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب تفاصيل استفسارك هنا..."
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                إرسال التذكرة
              </button>
            </form>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowForm(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              تذكرة دعم جديدة
            </button>

            {tickets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">لا توجد تذاكر دعم بعد</p>
                <p className="text-sm text-slate-400 mt-1">أنشئ تذكرة جديدة وسنرد عليك خلال 24 ساعة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => openTicket(ticket)}
                    className="w-full text-right bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-900 text-sm">{ticket.subject}</h3>
                      {statusBadge(ticket.status)}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">{ticket.message}</p>
                    <span className="text-xs text-slate-400">{formatDate(ticket.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
