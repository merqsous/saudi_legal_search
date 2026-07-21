'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, LogOut, LayoutDashboard, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface Study {
  id: number;
  query: string;
  created_at: string;
}

interface StudyDetail {
  id: number;
  query: string;
  content: string;
  citations: any[];
  created_at: string;
}

interface AuthUser {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
}

export default function StudiesPage() {
  const router = useRouter();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<StudyDetail | null>(null);
  const [studyLoading, setStudyLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');
    if (savedUser) {
      try { setAuthUser(JSON.parse(savedUser)); } catch {}
    }
    if (savedToken) {
      setAuthToken(savedToken);
      fetch('/api/legal-study/history', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then((r) => r.json())
        .then((d) => setStudies(d.studies || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const openStudy = async (id: number) => {
    if (!authToken) return;
    setStudyLoading(true);
    setSelectedStudy(null);
    try {
      const res = await fetch(`/api/legal-study/${id}`, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setSelectedStudy(data);
    } catch {}
    setStudyLoading(false);
  };

  const deleteStudy = async (id: number) => {
    if (!authToken) return;
    setStudies((prev) => prev.filter((s) => s.id !== id));
    if (selectedStudy?.id === id) setSelectedStudy(null);
    try {
      await fetch(`/api/legal-study/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatStudyContent = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (/^#{2,4}\s+/.test(trimmed)) {
        return <h3 key={i} className="font-bold text-primary-900 text-base mt-4 mb-2" dir="rtl">{trimmed.replace(/^#{1,4}\s+/, '')}</h3>;
      }
      if (/^#\s+/.test(trimmed)) {
        return <h2 key={i} className="font-bold text-primary-900 text-lg mt-5 mb-3" dir="rtl">{trimmed.replace(/^#\s+/, '')}</h2>;
      }
      if (/^\d+\.\s+/.test(trimmed)) {
        const cleanText = trimmed.replace(/^\d+\.\s+/, '');
        const parts = cleanText.split(/(\*\*.+?\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (/^\*\*.+\*\*$/.test(part)) {
            return <strong key={j} className="font-bold text-primary-800">{part.replace(/^\*\*(.+)\*\*$/, '$1')}</strong>;
          }
          return <span key={j}>{part}</span>;
        });
        return <h3 key={i} className="font-bold text-primary-900 text-base mt-4 mb-2" dir="rtl">{rendered}</h3>;
      }
      if (/^\*\*.+\*\*$/.test(trimmed)) {
        return <p key={i} className="font-bold text-primary-800 text-sm mt-2 mb-1" dir="rtl">{trimmed.replace(/^\*\*(.+)\*\*$/, '$1')}</p>;
      }
      const parts = trimmed.split(/(\*\*.+?\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (/^\*\*.+\*\*$/.test(part)) {
          return <strong key={j} className="font-bold text-primary-800">{part.replace(/^\*\*(.+)\*\*$/, '$1')}</strong>;
        }
        return <span key={j}>{part}</span>;
      });
      return <p key={i} className="text-sm text-slate-700 leading-relaxed mb-2" dir="rtl">{rendered}</p>;
    });
  };

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">يجب تسجيل الدخول لعرض الدراسات القانونية</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="https://albaheth.app" className="flex items-center gap-3">
            <img src="/logo-square.png" alt="الباحث" className="w-10 h-10 rounded-xl" />
          </a>
          <div className="flex-1" />
          {authUser && (
            <div className="flex items-center gap-3">
              {authUser.phone === '966514789632' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  لوحة التحكم
                </button>
              )}
              <button onClick={() => router.push('/search')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                البحث
              </button>
              <span className="text-sm text-slate-600">{authUser.first_name} {authUser.last_name}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {selectedStudy ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedStudy(null)}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <ChevronRight className="w-4 h-4" />
                رجوع للقائمة
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/legal-study/${selectedStudy.id}/export/docx?token=${authToken}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  <Download className="w-4 h-4" />
                  Word
                </a>
                <a
                  href={`/api/legal-study/${selectedStudy.id}/export/pdf?token=${authToken}`}
                  className="flex items-center gap-1.5 px-3 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </a>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h1 className="text-2xl font-bold text-primary-900 mb-2">{selectedStudy.query}</h1>
              <p className="text-xs text-slate-500 mb-6">{formatDate(selectedStudy.created_at)}</p>

              <div className="prose prose-sm max-w-none" dir="rtl">
                {formatStudyContent(selectedStudy.content)}
              </div>

              {selectedStudy.citations && selectedStudy.citations.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h2 className="font-bold text-primary-900 text-lg mb-4">الأحكام المرجعية</h2>
                  <div className="space-y-2">
                    {selectedStudy.citations.map((cite, i) => (
                      <div key={i} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="font-medium text-slate-700">{i + 1}.</span>{' '}
                        رقم الحكم: {cite.judgment_number || 'غير محدد'} —
                        المحكمة: {cite.court_type || ''} {cite.court_level || ''} —
                        المدينة: {cite.city || ''}
                        {cite.case_number && ` | رقم القضية: ${cite.case_number}/${cite.case_year || ''}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-bold text-amber-800 text-sm mb-1">إخلاء مسؤولية</h3>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    هذه الدراسة القانونية تم توليدها بواسطة نظام الباحث. مسؤولية التحقق من صحة المعلومات والوقائع تقع على المستخدم.
                  </p>
                  <p className="text-xs text-amber-600 leading-relaxed mt-1">
                    This legal study was generated by Albaheth AI system. The user is responsible for verifying the accuracy of all information and facts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <FileText className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-slate-900">الدراسات القانونية</h2>
              <span className="text-sm text-slate-600 mr-2">({studies.length})</span>
            </div>

            {studyLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : studies.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">لا توجد دراسات قانونية محفوظة</p>
                <button
                  onClick={() => router.push('/search')}
                  className="mt-4 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
                >
                  ابدأ البحث
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {studies.map((study) => (
                  <div
                    key={study.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openStudy(study.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 mb-1">{study.query}</h3>
                        <p className="text-xs text-slate-500">{formatDate(study.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteStudy(study.id); }}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
