'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, MessageSquare, ChevronDown, ChevronUp, BadgeCheck, Users } from 'lucide-react';
import { getVisitSource } from '../components/VisitTracker';
import Header from '../components/Header';

interface AuthUser {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
}

interface ConversationTurn {
  role: string;
  text: string;
}

interface ThreadResult {
  thread_id: string;
  topic: string | null;
  question: string;
  answer: string;
  confidence: string | null;
  status: string | null;
  responder_count: number | null;
  turn_count: number | null;
  conversation: ConversationTurn[] | null;
  match_type: string;
}

interface Topic {
  topic: string;
  count: number;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'إجابة موثوقة',
  medium: 'إجابة متوسطة الثقة',
};

const ROLE_LABEL: Record<string, string> = {
  questioner: 'السائل',
  responder: 'المجيب',
};

export default function ProceduralClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ThreadResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) { try { setAuthUser(JSON.parse(saved)); } catch {} }
    fetch('/api/procedural-topics')
      .then(r => r.json())
      .then(d => setTopics(d.topics || []))
      .catch(() => {});
  }, []);

  const buildParams = useCallback((q: string, page: number) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q);
    if (selectedTopic) params.set('topic', selectedTopic);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((page - 1) * PAGE_SIZE));
    if (!authUser) params.set('anonymous', 'true');
    const visit = getVisitSource();
    if (visit.source) params.set('source', visit.source);
    return params;
  }, [selectedTopic, authUser]);

  const handleResponse = (res: Response, data: any) => {
    if (res.status === 402) {
      setResults([]);
      if (data?.detail === 'registration_required') setRegistrationRequired(true);
      else setSubscriptionRequired(true);
      return false;
    }
    return true;
  };

  const doSearch = useCallback(async (q?: string) => {
    const term = q !== undefined ? q : query;
    setLoading(true);
    setHasSearched(true);
    setRegistrationRequired(false);
    setSubscriptionRequired(false);
    setCurrentPage(1);
    setExpanded(new Set());
    try {
      const res = await fetch(`/api/procedural-search?${buildParams(term, 1).toString()}`, {
        headers: { 'X-User-Phone': authUser?.phone || '' },
      });
      const data = await res.json();
      if (!handleResponse(res, data)) return;
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, buildParams, authUser]);

  const goToPage = async (page: number) => {
    setLoadingPage(true);
    try {
      const res = await fetch(`/api/procedural-search?${buildParams(query, page).toString()}`, {
        headers: { 'X-User-Phone': authUser?.phone || '' },
      });
      const data = await res.json();
      if (!handleResponse(res, data)) return;
      setResults(data.results || []);
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoadingPage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            الأسئلة الإجرائية
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            إجابات إجرائية من تجارب حقيقية — خطوات ناجز، التنفيذ، الإيجار، العمل، والعقود
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اسأل عن إجراء — مثال: كيف أرفع قضية في ناجز؟"
                className="w-full pr-11 pl-4 py-3.5 text-base bg-white border border-ink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                dir="rtl"
              />
            </div>
            <button
              onClick={() => doSearch()}
              disabled={loading}
              className="px-4 py-3.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-all flex items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Topic chips */}
        {topics.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setSelectedTopic(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !selectedTopic ? 'bg-primary-600 text-white shadow-sm' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
              }`}
            >
              الكل
            </button>
            {topics.map((t) => (
              <button
                key={t.topic}
                onClick={() => setSelectedTopic(t.topic === selectedTopic ? '' : t.topic)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTopic === t.topic
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                }`}
              >
                {t.topic} <span className="opacity-60">({t.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Browse hint — click a topic or search */}
        {!hasSearched && !loading && (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-ink-300 mx-auto mb-4" />
            <p className="text-ink-600 font-medium mb-1">ابحث في 3,308 سؤال إجرائي وأجوبتها</p>
            <p className="text-sm text-ink-400">أو اختر موضوعاً من الأعلى لتصفح الأسئلة</p>
            {selectedTopic && (
              <button onClick={() => doSearch('')} className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium">
                تصفح {selectedTopic}
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <p className="text-ink-500">جاري البحث...</p>
          </div>
        )}

        {/* Registration required */}
        {registrationRequired && (
          <div className="mt-6 bg-gradient-to-l from-primary-50 to-white border border-primary-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-ink-800 mb-2">سجّل للمتابعة</h3>
            <p className="text-sm text-ink-600 mb-4">
              أنشئ حساباً مجانياً واحصل على عمليتي بحث إضافيتين في الأسئلة الإجرائية والأحكام القضائية.
            </p>
            <button
              onClick={() => router.push('/?signup=1')}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              إنشاء حساب مجاني
            </button>
          </div>
        )}

        {/* Subscription required */}
        {subscriptionRequired && (
          <div className="mt-6 bg-gradient-to-l from-primary-50 to-white border border-primary-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-ink-800 mb-2">لقد استخدمت جميع عمليات البحث المجانية</h3>
            <p className="text-sm text-ink-600 mb-4">
              واصل البحث في الأسئلة الإجرائية والأحكام — اشتراك شهري، أو يوم واحد بدون حدود.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push('/pricing')}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                اشتراك شهري — 12 ريال
              </button>
              <button
                onClick={() => router.push('/pricing?plan=day_pass')}
                className="px-5 py-2.5 bg-white text-primary-700 border-2 border-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
              >
                يوم واحد بلا حدود — 5 ريال
              </button>
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && hasSearched && results.length === 0 && !subscriptionRequired && !registrationRequired && (
          <div className="text-center py-20">
            <Search className="w-10 h-10 text-ink-300 mx-auto mb-4" />
            <p className="text-ink-600 font-medium mb-1">لا توجد نتائج مطابقة</p>
            <p className="text-sm text-ink-400">جرّب صياغة أخرى أو ابحث في <a href="/search" className="text-primary-600 hover:underline">الأحكام القضائية</a></p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-ink-500 mb-4">{total} نتيجة</p>
            <div className="space-y-3">
              {results.map((t) => (
                <div key={t.thread_id} className="bg-white border border-ink-100 rounded-xl p-5 shadow-sm hover:shadow-card transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {t.topic && (
                        <span className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium">
                          {t.topic}
                        </span>
                      )}
                      {t.confidence && CONFIDENCE_LABEL[t.confidence] && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          t.confidence === 'high' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          <BadgeCheck className="w-3.5 h-3.5" />
                          {CONFIDENCE_LABEL[t.confidence]}
                        </span>
                      )}
                      {t.responder_count && t.responder_count > 1 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-ink-50 text-ink-600 rounded-lg text-xs">
                          <Users className="w-3.5 h-3.5" />
                          {t.responder_count} مجيبين
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-ink-900 leading-relaxed mb-3 arabic-text">
                    {t.question}
                  </h3>

                  {t.answer && (
                    <div className="bg-ink-50 rounded-lg p-4 mb-3">
                      <p className="text-sm text-ink-700 leading-relaxed arabic-text">{t.answer}</p>
                    </div>
                  )}

                  {t.conversation && t.conversation.length > 2 && (
                    <button
                      onClick={() => toggleExpand(t.thread_id)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {expanded.has(t.thread_id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {expanded.has(t.thread_id) ? 'إخفاء المحادثة' : `عرض المحادثة كاملة (${t.turn_count || t.conversation.length} ردود)`}
                    </button>
                  )}

                  {expanded.has(t.thread_id) && t.conversation && (
                    <div className="mt-3 pt-3 border-t border-ink-100 space-y-3">
                      {t.conversation.map((turn, i) => (
                        <div key={i} className={`flex gap-3 ${turn.role === 'responder' ? 'pr-4' : ''}`}>
                          <div className={`w-1 rounded-full shrink-0 ${turn.role === 'responder' ? 'bg-green-400' : 'bg-primary-300'}`} />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-ink-500 mb-1">
                              {ROLE_LABEL[turn.role] || turn.role}
                            </p>
                            <p className="text-sm text-ink-700 leading-relaxed arabic-text">{turn.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || loadingPage}
                  className="px-4 py-2 bg-white border border-ink-200 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                >
                  السابق
                </button>
                <span className="text-sm text-ink-600 px-3">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loadingPage}
                  className="px-4 py-2 bg-white border border-ink-200 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
