'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Briefcase, Loader2, Plus, X, CalendarDays, FileText, User, MapPin, Building2, Scale, Trash2, CheckCircle, ChevronRight, ExternalLink, Clock } from 'lucide-react';
import Header from '../../components/Header';
import { judgmentUrl } from '@/lib/slug';

interface CaseData {
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
}

interface Hearing {
  id: number;
  hearing_date: string;
  hearing_time: string | null;
  hijri_date: string | null;
  agenda: string | null;
  status: string;
}

interface LinkedJudgment {
  judgment_id: number;
  note: string | null;
  added_at: string;
  judgment_number: string | null;
  judgment_year: string | null;
  judgment_date_hijri: string | null;
  judgment_type: string | null;
  court_type: string | null;
  city: string | null;
  court_level: string | null;
}

const statusLabel: Record<string, string> = { active: 'نشطة', closed: 'مغلقة', archived: 'مؤرشفة' };
const hearingStatusLabel: Record<string, string> = { upcoming: 'قادمة', done: 'منعقدة', postponed: 'مؤجلة' };

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [judgments, setJudgments] = useState<LinkedJudgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Add hearing form
  const [showAddHearing, setShowAddHearing] = useState(false);
  const [hearingDate, setHearingDate] = useState('');
  const [hearingTime, setHearingTime] = useState('');
  const [hijriDate, setHijriDate] = useState('');
  const [agenda, setAgenda] = useState('');
  const [hearingSaving, setHearingSaving] = useState(false);

  // Edit case
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editOpponents, setEditOpponents] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadCase = useCallback(async (token: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404 || res.status === 401) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setCaseData(data.case);
      setHearings(data.hearings || []);
      setJudgments(data.judgments || []);
      setEditTitle(data.case.title);
      setEditClient(data.case.client_name || '');
      setEditOpponents(data.case.opponents || '');
      setEditNotes(data.case.notes || '');
    } catch {}
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setAuthToken(token);
    loadCase(token);
  }, [loadCase]);

  const addHearing = async () => {
    if (!hearingDate || !authToken) return;
    setHearingSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/hearings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          hearing_date: hearingDate,
          hearing_time: hearingTime || null,
          hijri_date: hijriDate || null,
          agenda: agenda || null,
        }),
      });
      if (res.ok) {
        setShowAddHearing(false);
        setHearingDate(''); setHearingTime(''); setHijriDate(''); setAgenda('');
        await loadCase(authToken);
      }
    } catch {}
    setHearingSaving(false);
  };

  const updateHearingStatus = async (hearingId: number, status: string) => {
    if (!authToken) return;
    setHearings((prev) => prev.map((h) => (h.id === hearingId ? { ...h, status } : h)));
    try {
      await fetch(`/api/cases/hearings/${hearingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const deleteHearing = async (hearingId: number) => {
    if (!authToken) return;
    setHearings((prev) => prev.filter((h) => h.id !== hearingId));
    try {
      await fetch(`/api/cases/hearings/${hearingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
  };

  const unlinkJudgment = async (judgmentId: number) => {
    if (!authToken) return;
    setJudgments((prev) => prev.filter((j) => j.judgment_id !== judgmentId));
    try {
      await fetch(`/api/cases/${caseId}/judgments/${judgmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
  };

  const saveEdit = async () => {
    if (!authToken) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          client_name: editClient.trim() || null,
          opponents: editOpponents.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setShowEdit(false);
        await loadCase(authToken);
      }
    } catch {}
    setEditSaving(false);
  };

  const changeStatus = async (status: string) => {
    if (!authToken) return;
    setCaseData((prev) => (prev ? { ...prev, status } : prev));
    try {
      await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const deleteCase = async () => {
    if (!authToken || !confirm('هل أنت متأكد من حذف هذه القضية؟ سيتم حذف جميع الجلسات والروابط المرتبطة بها.')) return;
    try {
      await fetch(`/api/cases/${caseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
    router.push('/cases');
  };

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-SA-u-ca-gregory', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">القضية غير موجودة</p>
          <button onClick={() => router.push('/cases')} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">
            العودة للقضايا
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back + actions */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/cases')} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
            <ChevronRight className="w-4 h-4" />
            كل القضايا
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-primary-600 border border-slate-200 rounded-lg hover:border-primary-300 transition-colors">
              تعديل
            </button>
            <button onClick={deleteCase} className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              حذف
            </button>
          </div>
        </div>

        {/* Case header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <h1 className="text-2xl font-bold text-slate-900">{caseData.title}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${caseData.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {statusLabel[caseData.status] || caseData.status}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">
                {caseData.client_name && (
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{caseData.client_name}</span>
                )}
                {caseData.opponents && (
                  <span className="flex items-center gap-1.5"><Scale className="w-4 h-4" />ضد: {caseData.opponents}</span>
                )}
                {caseData.case_number && (
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{caseData.case_number}{caseData.case_year ? `/${caseData.case_year}` : ''}</span>
                )}
                {caseData.court_type && (
                  <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" />{caseData.court_type}</span>
                )}
                {caseData.city && (
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{caseData.city}</span>
                )}
              </div>
              {caseData.notes && (
                <p className="mt-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                  {caseData.notes}
                </p>
              )}
            </div>
            {/* Quick status change */}
            <div className="flex gap-1 bg-slate-50 rounded-lg border border-slate-200 p-1">
              {['active', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    caseData.status === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {statusLabel[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hearings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-slate-900">الجلسات</h2>
              </div>
              <button
                onClick={() => setShowAddHearing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                جلسة
              </button>
            </div>

            {hearings.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">لا توجد جلسات مسجلة</p>
            ) : (
              <div className="space-y-3">
                {hearings.map((h) => {
                  const days = daysUntil(h.hearing_date);
                  const isUpcoming = h.status === 'upcoming' && days >= 0;
                  return (
                    <div
                      key={h.id}
                      className={`border rounded-xl p-4 ${
                        isUpcoming && days <= 3 ? 'border-red-200 bg-red-50' :
                        isUpcoming && days <= 7 ? 'border-amber-200 bg-amber-50' :
                        'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-bold text-slate-900 text-sm">{formatDate(h.hearing_date)}</span>
                            {h.hijri_date && <span className="text-xs text-primary-600 font-medium">{h.hijri_date}</span>}
                            {h.hearing_time && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {h.hearing_time}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                              h.status === 'upcoming' ? 'bg-blue-50 text-blue-700' :
                              h.status === 'done' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {hearingStatusLabel[h.status] || h.status}
                            </span>
                          </div>
                          {h.agenda && <p className="text-sm text-slate-600">{h.agenda}</p>}
                          {isUpcoming && (
                            <p className="text-xs mt-1.5 font-medium text-slate-500">
                              {days === 0 ? 'اليوم' : days === 1 ? 'غداً' : `بعد ${days} يوم`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {h.status === 'upcoming' && (
                            <>
                              <button
                                onClick={() => updateHearingStatus(h.id, 'done')}
                                title="تم الانعقاد"
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateHearingStatus(h.id, 'postponed')}
                                title="تأجيل"
                                className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteHearing(h.id)}
                            title="حذف"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked judgments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-slate-900">الأحكام المرتبطة</h2>
              <span className="text-xs text-slate-400">({judgments.length})</span>
            </div>

            {judgments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 mb-3">لا توجد أحكام مرتبطة بعد</p>
                <button
                  onClick={() => router.push('/search')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  ابحث واربط الأحكام بهذه القضية
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {judgments.map((j) => (
                  <div key={j.judgment_id} className="border border-slate-200 bg-slate-50 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-bold text-slate-900 text-sm">حكم رقم {j.judgment_number || j.judgment_id}</span>
                          {j.court_level && <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">{j.court_level}</span>}
                          {j.court_type && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{j.court_type}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          {j.city && <span>{j.city}</span>}
                          {j.judgment_year && <span>{j.judgment_year}</span>}
                          {j.judgment_date_hijri && <span>{j.judgment_date_hijri}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={judgmentUrl(j.judgment_id, {
                            court_type: j.court_type,
                            court_level: j.court_level,
                            city: j.city,
                            judgment_number: j.judgment_number,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="عرض الحكم"
                          className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => unlinkJudgment(j.judgment_id)}
                          title="إزالة الربط"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add hearing modal */}
      {showAddHearing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">جلسة جديدة</h2>
              <button onClick={() => setShowAddHearing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">التاريخ *</label>
                  <input
                    type="date"
                    value={hearingDate}
                    onChange={(e) => setHearingDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">الوقت</label>
                  <input
                    type="time"
                    value={hearingTime}
                    onChange={(e) => setHearingTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">التاريخ الهجري (اختياري)</label>
                <input
                  type="text"
                  value={hijriDate}
                  onChange={(e) => setHijriDate(e.target.value)}
                  placeholder="مثال: 15/3/1447"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">موضوع الجلسة</label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows={3}
                  placeholder="مثال: مواصلة نظر الدعوى وسماع الشهود"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              onClick={addHearing}
              disabled={hearingSaving || !hearingDate}
              className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {hearingSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              إضافة الجلسة
            </button>
          </div>
        </div>
      )}

      {/* Edit case modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">تعديل القضية</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان القضية</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">الموكل</label>
                  <input
                    type="text"
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">الخصم</label>
                  <input
                    type="text"
                    value={editOpponents}
                    onChange={(e) => setEditOpponents(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ملاحظات</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
              onClick={saveEdit}
              disabled={editSaving || !editTitle.trim()}
              className="w-full mt-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {editSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              حفظ التعديلات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
