'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2, Plus, X, CalendarDays, FileText, User, Search as SearchIcon, MapPin, Building2, Scale } from 'lucide-react';
import Header from '../components/Header';

interface CaseItem {
  id: number;
  title: string;
  client_name: string | null;
  case_number: string | null;
  case_year: string | null;
  court_type: string | null;
  city: string | null;
  opponents: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  judgments_count: number;
  next_hearing_date: string | null;
  next_hijri_date: string | null;
  next_hearing_agenda: string | null;
  next_hearing_time: string | null;
}

interface Filters {
  court_types: { code: string; name_ar: string }[];
  locations: { id: number; city_ar: string }[];
}

const statusLabel: Record<string, string> = {
  active: 'نشطة',
  closed: 'مغلقة',
  archived: 'مؤرشفة',
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Create form state
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [caseYear, setCaseYear] = useState('');
  const [courtType, setCourtType] = useState('');
  const [city, setCity] = useState('');
  const [opponents, setOpponents] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    setAuthToken(savedToken);
    fetch('/api/cases', { headers: { Authorization: `Bearer ${savedToken}` } })
      .then((r) => r.json())
      .then((d) => setCases(d.cases || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch('/api/filters')
      .then((r) => r.json())
      .then((d) => setFilters(d))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('عنوان القضية مطلوب');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          title: title.trim(),
          client_name: clientName.trim() || null,
          case_number: caseNumber.trim() || null,
          case_year: caseYear.trim() || null,
          court_type: courtType || null,
          city: city || null,
          opponents: opponents.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل إنشاء القضية');
      setShowCreate(false);
      setTitle(''); setClientName(''); setCaseNumber(''); setCaseYear('');
      setCourtType(''); setCity(''); setOpponents(''); setNotes('');
      // Reload list
      const refreshed = await fetch('/api/cases', { headers: { Authorization: `Bearer ${authToken}` } }).then((r) => r.json());
      setCases(refreshed.cases || []);
      router.push(`/cases/${data.case_id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'فشل إنشاء القضية');
    } finally {
      setSaving(false);
    }
  };

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  };

  const formatHearingDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const filtered = cases.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim();
      return (
        c.title.includes(q) ||
        (c.client_name || '').includes(q) ||
        (c.case_number || '').includes(q) ||
        (c.opponents || '').includes(q)
      );
    }
    return true;
  });

  const activeCount = cases.filter((c) => c.status === 'active').length;
  const upcomingThisWeek = cases.filter(
    (c) => c.next_hearing_date && daysUntil(c.next_hearing_date) >= 0 && daysUntil(c.next_hearing_date) <= 7
  ).length;

  if (!authToken && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">يجب تسجيل الدخول لإدارة القضايا</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">إدارة القضايا</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            قضية جديدة
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">إجمالي القضايا</p>
            <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">قضايا نشطة</p>
            <p className="text-2xl font-bold text-primary-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">جلسات خلال أسبوع</p>
            <p className="text-2xl font-bold text-amber-600">{upcomingThisWeek}</p>
          </div>
        </div>

        {/* Filter + search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'active', label: 'نشطة' },
              { key: 'closed', label: 'مغلقة' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === t.key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في قضاياك..."
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Cases list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">{cases.length === 0 ? 'لا توجد قضايا بعد' : 'لا توجد نتائج مطابقة'}</p>
            {cases.length === 0 && (
              <p className="text-sm text-slate-400 mb-6">أنشئ قضيتك الأولى واربط بها الأحكام والأبحاث ذات الصلة</p>
            )}
            {cases.length === 0 && (
              <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">
                إنشاء قضية
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const days = c.next_hearing_date ? daysUntil(c.next_hearing_date) : null;
              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="w-full text-right bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-bold text-slate-900">{c.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            c.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {statusLabel[c.status] || c.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">
                        {c.client_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {c.client_name}
                          </span>
                        )}
                        {c.case_number && (
                          <span className="flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5" />
                            {c.case_number}{c.case_year ? `/${c.case_year}` : ''}
                          </span>
                        )}
                        {c.court_type && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {c.court_type}
                          </span>
                        )}
                        {c.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {c.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {c.next_hearing_date && days !== null && days >= 0 ? (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                            days <= 3 ? 'bg-red-50 text-red-700' : days <= 7 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <CalendarDays className="w-3.5 h-3.5 inline ml-1" />
                          الجلسة {days === 0 ? 'اليوم' : days === 1 ? 'غداً' : `بعد ${days} يوم`}
                        </span>
                      ) : c.next_hearing_date ? (
                        <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-slate-100 text-slate-500">
                          جلسة فائتة
                        </span>
                      ) : null}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {c.judgments_count} حكم مرتبط
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Create case modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">قضية جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{formError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان القضية *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: قضية تعويض ضد شركة..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم الموكل</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">الخصم</label>
                  <input
                    type="text"
                    value={opponents}
                    onChange={(e) => setOpponents(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">رقم القضية</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="1234"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">السنة</label>
                  <input
                    type="text"
                    value={caseYear}
                    onChange={(e) => setCaseYear(e.target.value)}
                    placeholder="1446"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">المحكمة</label>
                  <select
                    value={courtType}
                    onChange={(e) => setCourtType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">اختر المحكمة</option>
                    {(filters?.court_types || []).map((ct) => (
                      <option key={ct.code} value={ct.name_ar}>{ct.name_ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">المدينة</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">اختر المدينة</option>
                    {(filters?.locations || []).map((l) => (
                      <option key={l.id} value={l.city_ar}>{l.city_ar}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              إنشاء القضية
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
