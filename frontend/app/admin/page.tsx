'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, LogOut, Loader2, Users, Search, Database, TrendingUp, Clock, ArrowRight, MessageSquare, Send, ChevronRight, CheckCircle, X } from 'lucide-react';

interface AdminStats {
  total_judgments: number;
  total_cases: number;
  total_users: number;
  total_searches: number;
  anonymous_searches: number;
  top_keywords: { query: string; cnt: number }[];
  top_court_types: { court_type: string; name_ar: string; cnt: number }[];
  users: {
    id: number;
    phone: string;
    first_name: string;
    last_name: string;
    ip_address: string | null;
    country: string | null;
    created_at: string;
    search_count: number;
    last_search: string | null;
  }[];
  recent_searches: {
    query: string;
    phone: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
    results_count: number;
    ip_address: string | null;
    country: string | null;
    is_anonymous: boolean;
  }[];
  searches_by_day: { day: string; cnt: number }[];
  recent_cases: {
    id: number;
    judgment_number: string | null;
    judgment_year: string | null;
    judgment_type: string | null;
    details_url: string | null;
    case_number: string | null;
    case_year: string | null;
    court_type: string | null;
    city: string | null;
  }[];
}

interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface SupportReply {
  id: number;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<SupportReply[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (!saved) {
      router.push('/');
      return;
    }
    try {
      const user = JSON.parse(saved);
      if (user.phone !== '966514789632') {
        router.push('/search');
        return;
      }
    } catch {
      router.push('/');
      return;
    }

    const token = localStorage.getItem('auth_token');
    fetch('/api/auth/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load stats');
        return r.json();
      })
      .then((data) => setStats(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    fetchSupportTickets(token);
  }, [router]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchSupportTickets = async (t: string | null) => {
    if (!t) return;
    setSupportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support/admin/tickets`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setSupportTickets(data.tickets || []);
    } catch {
      // silent fail
    } finally {
      setSupportLoading(false);
    }
  };

  const openSupportTicket = async (ticket: SupportTicket) => {
    const t = localStorage.getItem('auth_token');
    if (!t) return;
    try {
      const res = await fetch(`${API_BASE}/api/support/admin/ticket/${ticket.id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setSelectedTicket(data.ticket);
      setTicketReplies(data.replies || []);
    } catch {
      setError('فشل تحميل التذكرة');
    }
  };

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply.trim() || !selectedTicket) return;
    const t = localStorage.getItem('auth_token');
    if (!t) return;
    setReplySubmitting(true);
    try {
      await fetch(`${API_BASE}/api/support/admin/ticket/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ message: adminReply.trim() }),
      });
      setAdminReply('');
      openSupportTicket(selectedTicket);
      fetchSupportTickets(t);
    } catch {
      setError('فشل إرسال الرد');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleCloseTicket = async (ticketId: number) => {
    const t = localStorage.getItem('auth_token');
    if (!t) return;
    try {
      await fetch(`${API_BASE}/api/support/admin/ticket/${ticketId}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      setSelectedTicket(null);
      fetchSupportTickets(t);
    } catch {
      setError('فشل إغلاق التذكرة');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  const formatDate = (dt: string) => {
    if (!dt) return '-';
    const d = new Date(dt);
    return d.toLocaleDateString('ar-SA') + ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo-rounded.png" alt="الباحث" className="w-10 h-10 rounded-lg" width={40} height={40} />
            <h1 className="text-xl font-bold text-slate-900">لوحة التحكم</h1>
          </a>
          <div className="flex-1" />
          <button
            onClick={() => router.push('/search')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            البحث
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-50 text-primary-600">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-500">إجمالي الأحكام</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total_judgments.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-500">إجمالي القضايا</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total_cases.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-500">إجمالي المستخدمين</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total_users}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-500">إجمالي عمليات البحث</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total_searches}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-50 text-orange-600">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-sm text-slate-500">بحث بدون تسجيل</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.anonymous_searches}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Keywords */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-slate-900">أكثر الكلمات بحثاً</h2>
            </div>
            <div className="space-y-2">
              {stats.top_keywords.length === 0 && (
                <p className="text-sm text-slate-400">لا توجد بيانات</p>
              )}
              {stats.top_keywords.map((kw, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                    <span className="text-sm text-slate-700" dir="rtl">{kw.query}</span>
                  </div>
                  <span className="text-sm font-bold text-primary-600">{kw.cnt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Court Types */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-slate-900">أكثر أنواع المحاكم استخداماً</h2>
            </div>
            <div className="space-y-2">
              {stats.top_court_types.length === 0 && (
                <p className="text-sm text-slate-400">لا توجد بيانات</p>
              )}
              {stats.top_court_types.map((ct, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                    <span className="text-sm text-slate-700" dir="rtl">{ct.name_ar || ct.court_type}</span>
                  </div>
                  <span className="text-sm font-bold text-primary-600">{ct.cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-slate-900">المستخدمين</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs">
                  <th className="text-right py-3 px-2">الاسم</th>
                  <th className="text-right py-3 px-2">الهاتف</th>
                  <th className="text-right py-3 px-2">IP</th>
                  <th className="text-right py-3 px-2">الدولة</th>
                  <th className="text-right py-3 px-2">عمليات البحث</th>
                  <th className="text-right py-3 px-2">آخر بحث</th>
                  <th className="text-right py-3 px-2">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-2 text-slate-700" dir="rtl">{u.first_name} {u.last_name}</td>
                    <td className="py-3 px-2 text-slate-600" dir="ltr">{u.phone}</td>
                    <td className="py-3 px-2 text-slate-500" dir="ltr">{u.ip_address || '-'}</td>
                    <td className="py-3 px-2 text-slate-500">{u.country || '-'}</td>
                    <td className="py-3 px-2 font-bold text-primary-600">{u.search_count}</td>
                    <td className="py-3 px-2 text-slate-500">{u.last_search ? formatDate(u.last_search) : '-'}</td>
                    <td className="py-3 px-2 text-slate-500">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Searches */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-slate-900">آخر عمليات البحث</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs">
                  <th className="text-right py-3 px-2">البحث</th>
                  <th className="text-right py-3 px-2">المستخدم</th>
                  <th className="text-right py-3 px-2">IP</th>
                  <th className="text-right py-3 px-2">الدولة</th>
                  <th className="text-right py-3 px-2">النتائج</th>
                  <th className="text-right py-3 px-2">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_searches.map((s, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-2 text-slate-700" dir="rtl">{s.query}</td>
                    <td className="py-3 px-2 text-slate-600" dir="rtl">
                      {s.is_anonymous ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700">
                          زائر
                        </span>
                      ) : (
                        s.first_name ? `${s.first_name} ${s.last_name}` : s.phone
                      )}
                    </td>
                    <td className="py-3 px-2 text-slate-500" dir="ltr">{s.ip_address || '-'}</td>
                    <td className="py-3 px-2 text-slate-500">{s.country || '-'}</td>
                    <td className="py-3 px-2 text-slate-500">{s.results_count}</td>
                    <td className="py-3 px-2 text-slate-500">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Cases Added */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-slate-900">أحدث الأحكام المضافة</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs">
                  <th className="text-right py-3 px-2">رقم الحكم</th>
                  <th className="text-right py-3 px-2">السنة</th>
                  <th className="text-right py-3 px-2">نوع المحكمة</th>
                  <th className="text-right py-3 px-2">المدينة</th>
                  <th className="text-right py-3 px-2">رقم القضية</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_cases || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">لا توجد بيانات</td>
                  </tr>
                )}
                {(stats.recent_cases || []).map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-2 text-slate-700" dir="ltr">{c.judgment_number || '-'}</td>
                    <td className="py-3 px-2 text-slate-500">{c.judgment_year || '-'}</td>
                    <td className="py-3 px-2 text-slate-600" dir="rtl">{c.court_type || '-'}</td>
                    <td className="py-3 px-2 text-slate-600" dir="rtl">{c.city || '-'}</td>
                    <td className="py-3 px-2 text-slate-500" dir="ltr">{c.case_number || '-'}/{c.case_year || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-slate-900">تذاكر الدعم الفني</h2>
            {supportTickets.filter(t => t.status === 'open').length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">
                {supportTickets.filter(t => t.status === 'open').length} جديدة
              </span>
            )}
          </div>

          {selectedTicket ? (
            <div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" /> رجوع للقائمة
              </button>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{selectedTicket.subject}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${selectedTicket.status === 'open' ? 'bg-amber-50 text-amber-700' : selectedTicket.status === 'answered' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {selectedTicket.status === 'open' ? 'مفتوحة' : selectedTicket.status === 'answered' ? 'تم الرد' : 'مغلقة'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-2">
                  من: {selectedTicket.first_name} {selectedTicket.last_name} — {selectedTicket.phone}
                </p>
                <p className="text-sm text-slate-400 mb-3">{formatDate(selectedTicket.created_at)}</p>
                <div className="bg-slate-50 rounded-xl p-4 text-slate-700 leading-relaxed text-sm">
                  {selectedTicket.message}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {ticketReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`rounded-xl p-4 ${reply.is_admin ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50 border border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${reply.is_admin ? 'text-primary-700' : 'text-slate-600'}`}>
                        {reply.is_admin ? 'فريق الدعم' : 'المستخدم'}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(reply.created_at)}</span>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <form onSubmit={handleAdminReply} className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={adminReply}
                      onChange={(e) => setAdminReply(e.target.value)}
                      placeholder="اكتب ردك..."
                      className="flex-1 rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <button
                      type="submit"
                      disabled={replySubmitting || !adminReply.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {replySubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      رد
                    </button>
                  </form>
                  <button
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
                  >
                    <X className="w-4 h-4" />
                    إغلاق
                  </button>
                </div>
              )}
            </div>
          ) : supportLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : supportTickets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">لا توجد تذاكر دعم</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs">
                    <th className="text-right py-3 px-2">الموضوع</th>
                    <th className="text-right py-3 px-2">المستخدم</th>
                    <th className="text-right py-3 px-2">الهاتف</th>
                    <th className="text-right py-3 px-2">الحالة</th>
                    <th className="text-right py-3 px-2">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {supportTickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openSupportTicket(t)}
                      className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
                    >
                      <td className="py-3 px-2 text-slate-700 font-medium">{t.subject}</td>
                      <td className="py-3 px-2 text-slate-600">{t.first_name} {t.last_name}</td>
                      <td className="py-3 px-2 text-slate-500" dir="ltr">{t.phone}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.status === 'open' ? 'bg-amber-50 text-amber-700' : t.status === 'answered' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {t.status === 'open' ? 'مفتوحة' : t.status === 'answered' ? 'تم الرد' : 'مغلقة'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-500">{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
