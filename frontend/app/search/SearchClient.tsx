'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, ExternalLink, Scale, Filter, X, ChevronDown, Sparkles, LogOut, LayoutDashboard, CheckCircle, MapPin, Building2, Gavel, Bookmark, FileText, Download, BookOpen } from 'lucide-react';
import { judgmentUrl } from '@/lib/slug';

interface AuthUser {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
}

interface SearchResult {
  judgment_id: number;
  judgment_number: string | null;
  judgment_year: string | null;
  judgment_date_hijri: string | null;
  judgment_type: string | null;
  details_url: string | null;
  case_number: string | null;
  case_year: string | null;
  court_type: string | null;
  court_type_code: string | null;
  city: string | null;
  court_level: string | null;
  court_level_code: string | null;
  section_name: string | null;
  snippet: string;
  distance: number | null;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  limit: number;
  offset: number;
  ai_answer?: string | null;
}

interface Filters {
  court_types: { code: string; name_ar: string }[];
  locations: { id: number; city_ar: string }[];
  years: string[];
  court_levels: { code: string; name_ar: string }[];
}

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [selectedCourtType, setSelectedCourtType] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCourtLevel, setSelectedCourtLevel] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [anonymousSearchCount, setAnonymousSearchCount] = useState(0);
  const [favoritedIds, setFavoritedIds] = useState<Set<number>>(new Set());
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyContent, setStudyContent] = useState<string | null>(null);
  const [studyCitations, setStudyCitations] = useState<any[]>([]);
  const [studyId, setStudyId] = useState<number | null>(null);
  const [showStudy, setShowStudy] = useState(false);
  const isAnonymous = !authUser;
  const hasReachedAnonymousLimit = isAnonymous && anonymousSearchCount >= 3;

  const FREE_PREVIEW_LIMIT = 3;

  // Quick filter presets
  const quickFilters = [
    { label: 'تجاري', icon: Building2, action: () => { setSelectedCourtType('commercial'); doSearch(); } },
    { label: 'الرياض', icon: MapPin, action: () => { setSelectedCity('الرياض'); doSearch(); } },
    { label: 'المدينة المنورة', icon: MapPin, action: () => { setSelectedCity('المدينة المنورة'); doSearch(); } },
    { label: 'استئناف', icon: Gavel, action: () => { setSelectedCourtLevel('appeal'); doSearch(); } },
    { label: 'الدرجة الأولى', icon: Gavel, action: () => { setSelectedCourtLevel('first_instance'); doSearch(); } },
    { label: 'الوقائع', icon: Scale, action: () => { setSelectedSection('الوقائع'); doSearch(); } },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');
    if (saved) {
      try { setAuthUser(JSON.parse(saved)); } catch {}
    }
    if (savedToken) {
      setAuthToken(savedToken);
      // Load existing favorites
      fetch('http://localhost:8000/api/favorites', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then((r) => {
          if (r.status === 401) {
            // Token expired — clear it
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setAuthToken(null);
            setAuthUser(null);
            return null;
          }
          return r.json();
        })
        .then((d) => {
          if (d?.favorites) {
            setFavoritedIds(new Set(d.favorites.map((f: any) => f.judgment_id)));
          }
        })
        .catch(() => {});
    }
    const anonCount = localStorage.getItem('anonymous_search_count');
    if (anonCount) {
      try { setAnonymousSearchCount(parseInt(anonCount, 10) || 0); } catch {}
    }
    fetch('/api/filters')
      .then((r) => r.json())
      .then((data) => setFilters(data))
      .catch(() => {});

    // Auto-search from URL params (e.g. ?court_level=appeal)
    const urlQuery = searchParams.get('q') || '';
    const urlCourtType = searchParams.get('court_type') || '';
    const urlCity = searchParams.get('city') || '';
    const urlYear = searchParams.get('year') || '';
    const urlCourtLevel = searchParams.get('court_level') || '';
    const urlSection = searchParams.get('section') || '';
    if (urlQuery || urlCourtType || urlCity || urlYear || urlCourtLevel || urlSection) {
      setQuery(urlQuery);
      setSelectedCourtType(urlCourtType);
      setSelectedCity(urlCity);
      setSelectedYear(urlYear);
      setSelectedCourtLevel(urlCourtLevel);
      setSelectedSection(urlSection);
    }
  }, [router, searchParams]);

  const doSearch = useCallback(async () => {
    const hasQuery = query.trim().length > 0;
    const hasFilters = selectedCourtType || selectedCity || selectedYear || selectedCourtLevel || selectedSection;
    if (!hasQuery && !hasFilters) return;

    if (hasReachedAnonymousLimit) {
      setError('لقد استنفدت عمليات البحث المجانية. يرجى تسجيل الدخول للمتابعة.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    const params = new URLSearchParams({ q: query, limit: '20' });
    if (selectedCourtType) params.set('court_type', selectedCourtType);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedYear) params.set('year', selectedYear);
    if (selectedCourtLevel) params.set('court_level', selectedCourtLevel);
    if (selectedSection) params.set('section', selectedSection);
    if (isAnonymous) params.set('anonymous', 'true');

    try {
      const res = await fetch(`/api/search?${params.toString()}`, {
        headers: { 'X-User-Phone': authUser?.phone || '' },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: SearchResponse = await res.json();
      setResults(data.results);
      setTotal(data.total);
      setAiAnswer(null);

      // Google Ads conversion tracking
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          send_to: 'AW-18318854762/AtLpCLyzsc8cEOqUjp9E',
          value: 1.0,
          currency: 'USD',
          transaction_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
      }

      if (isAnonymous) {
        const newCount = anonymousSearchCount + 1;
        setAnonymousSearchCount(newCount);
        localStorage.setItem('anonymous_search_count', String(newCount));
      }

      // AI answer for all users
      setAiLoading(true);
      const aiParams = new URLSearchParams({ q: query, limit: '20' });
      if (selectedCourtType) aiParams.set('court_type', selectedCourtType);
      if (selectedCity) aiParams.set('city', selectedCity);
      if (selectedYear) aiParams.set('year', selectedYear);
      if (selectedCourtLevel) aiParams.set('court_level', selectedCourtLevel);
      if (selectedSection) aiParams.set('section', selectedSection);
      fetch(`/api/ai-answer?${aiParams.toString()}`)
        .then((r) => r.json())
        .then((d) => setAiAnswer(d.ai_answer ?? null))
        .catch(() => setAiAnswer(null))
        .finally(() => setAiLoading(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCourtType, selectedCity, selectedYear, selectedCourtLevel, selectedSection, isAnonymous, anonymousSearchCount, hasReachedAnonymousLimit, authUser?.phone]);

  // Auto-trigger search when URL params populated the filters
  const [autoSearched, setAutoSearched] = useState(false);
  useEffect(() => {
    const hasUrlParams = searchParams.get('court_type') || searchParams.get('court_level') || searchParams.get('city') || searchParams.get('q') || searchParams.get('section');
    if (hasUrlParams && !autoSearched && (selectedCourtType || selectedCourtLevel || selectedCity || query || selectedSection)) {
      setAutoSearched(true);
      doSearch();
    }
  }, [searchParams, autoSearched, selectedCourtType, selectedCourtLevel, selectedCity, query, selectedSection, doSearch]);

  const formatAiAnswer = (text: string) => {
    const parts = text.split(/(\(\d+\))/g);
    return parts.map((part, i) => {
      if (/^\(\d+\)$/.test(part)) {
        return <span key={i} className="text-primary-600 font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch();
  };

  const toggleFavorite = async (judgmentId: number) => {
    if (!authToken) {
      router.push('/?signup=1');
      return;
    }
    const isFav = favoritedIds.has(judgmentId);
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(judgmentId);
      else next.add(judgmentId);
      return next;
    });
    try {
      await fetch(`http://localhost:8000/api/favorites/${judgmentId}`, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
  };

  const generateStudy = async () => {
    if (!authToken) {
      router.push('/?signup=1');
      return;
    }
    if (results.length === 0) return;
    setStudyLoading(true);
    setShowStudy(true);
    setStudyContent(null);
    setStudyId(null);
    try {
      const res = await fetch('http://localhost:8000/api/legal-study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          query,
          court_type: selectedCourtType || null,
          city: selectedCity || null,
          year: selectedYear || null,
          court_level: selectedCourtLevel || null,
          section: selectedSection || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStudyContent(data.content);
      setStudyCitations(data.citations || []);
      setStudyId(data.id);
    } catch (e) {
      setStudyContent(`فشل في توليد الدراسة القانونية. ${e instanceof Error ? e.message : 'حاول مرة أخرى.'}`);
    } finally {
      setStudyLoading(false);
    }
  };

  const formatStudyContent = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
      const trimmed = line.trim();
      // Markdown headings: ##, ###, ####
      if (/^#{2,4}\s+/.test(trimmed)) {
        return <h3 key={i} className="font-bold text-primary-900 text-base mt-4 mb-2" dir="rtl">{trimmed.replace(/^#{1,4}\s+/, '')}</h3>;
      }
      // Markdown heading: #
      if (/^#\s+/.test(trimmed)) {
        return <h2 key={i} className="font-bold text-primary-900 text-lg mt-5 mb-3" dir="rtl">{trimmed.replace(/^#\s+/, '')}</h2>;
      }
      // Numbered heading: 1. 2. etc
      if (/^\d+\.\s+/.test(trimmed)) {
        // Strip markdown bold from numbered items and render with inline bold
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
      // Bold line: **text**
      if (/^\*\*.+\*\*$/.test(trimmed)) {
        return <p key={i} className="font-bold text-primary-800 text-sm mt-2 mb-1" dir="rtl">{trimmed.replace(/^\*\*(.+)\*\*$/, '$1')}</p>;
      }
      // Regular paragraph with inline bold
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

  const clearFilters = () => {
    setSelectedCourtType('');
    setSelectedCity('');
    setSelectedYear('');
    setSelectedCourtLevel('');
    setSelectedSection('');
  };

  const activeFilterCount =
    (selectedCourtType ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedYear ? 1 : 0) +
    (selectedCourtLevel ? 1 : 0) +
    (selectedSection ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src="/logo-square.png" alt="الباحث" className="w-10 h-10 rounded-lg" />
          <h1 className="text-xl font-bold text-slate-900">الباحث</h1>
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
              <button
                onClick={() => router.push('/favorites')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium"
              >
                <Bookmark className="w-4 h-4" />
                المفضلة
              </button>
              <button
                onClick={() => router.push('/studies')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium"
              >
                <FileText className="w-4 h-4" />
                الدراسات
              </button>
              <span className="text-sm text-slate-600">{authUser.first_name} {authUser.last_name}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
          {!authUser && (
            <div className="flex items-center gap-2">
              {anonymousSearchCount > 0 && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  {Math.max(0, FREE_PREVIEW_LIMIT - anonymousSearchCount)} بحث مجاني متبقي
                </span>
              )}
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => router.push('/?signup=1')}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                إنشاء حساب
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="relative mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ابحث عن حكم قضائي..."
                className="w-full pr-11 pl-4 py-3.5 text-base bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3.5 rounded-xl border transition-all flex items-center gap-2 ${
                showFilters || activeFilterCount > 0
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="text-xs font-bold bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Filters */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">بحث سريع:</span>
            {quickFilters.map((qf, idx) => {
              const Icon = qf.icon;
              const isActive = 
                (qf.label === 'تجاري' && selectedCourtType === 'commercial') ||
                (qf.label === 'الرياض' && selectedCity === 'الرياض') ||
                (qf.label === 'المدينة المنورة' && selectedCity === 'المدينة المنورة') ||
                (qf.label === 'استئناف' && selectedCourtLevel === 'appeal') ||
                (qf.label === 'الدرجة الأولى' && selectedCourtLevel === 'first_instance') ||
                (qf.label === 'الوقائع' && selectedSection === 'الوقائع');
              
              return (
                <button
                  key={idx}
                  onClick={qf.action}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {qf.label}
                </button>
              );
            })}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">تصفية النتائج</h3>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-700">
                    مسح الكل
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filters && (
                  <>
                    <FilterSelect
                      label="نوع المحكمة"
                      value={selectedCourtType}
                      onChange={setSelectedCourtType}
                      options={filters.court_types.map(ct => ({ value: ct.code, label: ct.name_ar }))}
                    />
                    <FilterSelect
                      label="المدينة"
                      value={selectedCity}
                      onChange={setSelectedCity}
                      options={filters.locations.map(l => ({ value: l.city_ar, label: l.city_ar }))}
                    />
                    <FilterSelect
                      label="السنة"
                      value={selectedYear}
                      onChange={setSelectedYear}
                      options={filters.years.map(y => ({ value: y, label: y }))}
                    />
                    <FilterSelect
                      label="درجة المحكمة"
                      value={selectedCourtLevel}
                      onChange={setSelectedCourtLevel}
                      options={filters.court_levels.map(cl => ({ value: cl.code, label: cl.name_ar }))}
                    />
                  </>
                )}
              </div>
              <button
                onClick={() => doSearch()}
                disabled={loading}
                className="mt-3 w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {'تطبيق الفلترة'}
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <p className="text-slate-500">جاري البحث...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* No results */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">لا توجد نتائج</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            {(aiAnswer || aiLoading) && (
              <div className="mb-6 bg-gradient-to-l from-primary-50 to-white border border-primary-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  <h2 className="text-sm font-bold text-slate-800">إجابة قانونية مساعدة</h2>
                  {aiLoading && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
                </div>
                {aiAnswer ? (
                  <p className="text-sm text-slate-700 leading-relaxed arabic-text" dir="rtl">
                    {formatAiAnswer(aiAnswer)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">جاري توليد الإجابة...</p>
                )}
              </div>
            )}
            <p className="text-sm text-slate-500 mb-4">
              {total} نتيجة
            </p>

            {/* Legal Study Button */}
            {!isAnonymous && (
              <div className="mb-4">
                <button
                  onClick={generateStudy}
                  disabled={studyLoading}
                  className="w-full py-3 bg-gradient-to-l from-primary-600 to-primary-700 text-white rounded-xl font-bold hover:from-primary-700 hover:to-primary-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {studyLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> جاري توليد الدراسة القانونية...</>
                  ) : (
                    <><BookOpen className="w-5 h-5" /> توليد دراسة قانونية شاملة</>
                  )}
                </button>
              </div>
            )}

            {/* Legal Study Panel */}
            {showStudy && (
              <div className="mb-6 bg-white border-2 border-primary-200 rounded-xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-bold text-slate-900">دراسة قانونية</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {studyId && !studyLoading && (
                      <>
                        <a
                          href={`http://localhost:8000/api/legal-study/${studyId}/export/docx?token=${authToken}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Word
                        </a>
                        <a
                          href={`http://localhost:8000/api/legal-study/${studyId}/export/pdf?token=${authToken}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-600 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => setShowStudy(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {studyLoading ? (
                  <div className="flex flex-col items-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
                    <p className="text-sm text-slate-500">جاري توليد الدراسة القانونية الشاملة...</p>
                  </div>
                ) : studyContent ? (
                  <>
                    <div className="prose prose-sm max-w-none mb-4" dir="rtl">
                      {formatStudyContent(studyContent)}
                    </div>
                    {studyCitations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h3 className="font-bold text-primary-900 text-sm mb-3">الأحكام المرجعية</h3>
                        <div className="space-y-2">
                          {studyCitations.map((cite, i) => (
                            <div key={i} className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
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
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700 leading-relaxed">
                          ⚠️ هذه الدراسة القانونية تم توليدها بواسطة نظام الباحث. مسؤولية التحقق من صحة المعلومات والوقائع تقع على المستخدم.
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            <div className="space-y-3">
              {results.map((result, idx) => (
                <ResultCard
                  key={`${result.judgment_id}-${idx}`}
                  result={result}
                  query={query}
                  favorited={favoritedIds.has(result.judgment_id)}
                  onToggleFavorite={() => toggleFavorite(result.judgment_id)}
                  isLoggedIn={!!authToken}
                />
              ))}
            </div>
            {isAnonymous && (
              <div className="mt-6 bg-gradient-to-l from-primary-50 to-white border border-primary-200 rounded-xl p-6 text-center">
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {hasReachedAnonymousLimit
                    ? 'لقد استنفدت عمليات البحث المجانية'
                    : 'شاهد جميع النتائج'}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {hasReachedAnonymousLimit
                    ? 'سجّل الدخول مجاناً للاستمرار في البحث والوصول لكل الأحكام.'
                    : `هذه نتيجة معاينة فقط. سجّل الدخول للوصول إلى ${total} نتيجة.`}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => router.push('/')}
                    className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => router.push('/?signup=1')}
                    className="px-5 py-2.5 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
                  >
                    إنشاء حساب مجاني
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
          الباحث — بحث في الأحكام القضائية السعودية
        </div>
      </footer>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
        >
          <option value="">الكل</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function ResultCard({ result, query, favorited, onToggleFavorite, isLoggedIn }: {
  result: SearchResult;
  query: string;
  favorited: boolean;
  onToggleFavorite: () => void;
  isLoggedIn: boolean;
}) {
  const relevance = result.distance != null ? Math.max(0, Math.min(1, 1.0 - result.distance * 0.5)) : null;

  const highlightSnippet = (text: string, q: string) => {
    if (!q.trim()) return text;
    const queryWords = new Set(q.trim().toLowerCase().split(/\s+/).filter(w => w.length >= 2));
    if (queryWords.size === 0) return text;

    // Split into sentences (Arabic and English delimiters)
    const sentences = text.split(/(?<=[.؟!،؛\n])\s+/);
    if (sentences.length <= 1) return text;

    // Score each sentence by query term overlap
    const scored = sentences.map(s => {
      const lower = s.toLowerCase();
      let matches = 0;
      queryWords.forEach(w => { if (lower.includes(w)) matches++; });
      return { text: s, score: matches / queryWords.size, matches };
    });

    // Highlight sentences with >= 30% query term overlap
    return scored.map((s, i) => {
      if (s.score >= 0.3 && s.matches > 0) {
        return <mark key={i} className="bg-primary-100 text-primary-900 rounded px-0.5">{s.text} </mark>;
      }
      return <span key={i}>{s.text} </span>;
    });
  };

  return (
    <div className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges + Favorite */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <a
              href={judgmentUrl(result.judgment_id, { court_type: result.court_type, court_level: result.court_level, city: result.city, judgment_number: result.judgment_number })}
              className="flex flex-wrap items-center gap-2"
            >
              {result.court_type && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700">
                  {result.court_type}
                </span>
              )}
              {result.city && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                  {result.city}
                </span>
              )}
              {result.court_level && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                  {result.court_level}
                </span>
              )}
              {result.section_name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                  {result.section_name}
                </span>
              )}
            </a>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(); }}
              className={`ml-auto p-1 transition-colors ${favorited ? 'text-primary-600' : 'text-slate-300 hover:text-primary-600'}`}
              title={favorited ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            >
              <Bookmark className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* البيانات الأساسية */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3" dir="rtl">
            <h4 className="text-xs font-semibold text-slate-500 mb-2">البيانات الأساسية</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              {result.case_number && (
                <div>
                  <span className="text-slate-500">رقم القضية:</span>
                  <span className="font-medium text-slate-700 mr-1">{result.case_number}/{result.case_year ?? ''}</span>
                </div>
              )}
              {result.judgment_number && (
                <div>
                  <span className="text-slate-500">رقم الحكم:</span>
                  <span className="font-medium text-slate-700 mr-1">{result.judgment_number}</span>
                </div>
              )}
              {result.judgment_date_hijri && (
                <div>
                  <span className="text-slate-500">التاريخ:</span>
                  <span className="font-medium text-slate-700 mr-1">{result.judgment_date_hijri}</span>
                </div>
              )}
            </div>
          </div>

          {/* Snippet */}
          <a
            href={judgmentUrl(result.judgment_id, { court_type: result.court_type, court_level: result.court_level, city: result.city, judgment_number: result.judgment_number })}
          >
            <p className="text-sm text-slate-700 leading-relaxed arabic-text" dir="rtl">
              {highlightSnippet(result.snippet, query)}
            </p>
          </a>

          {/* Link */}
          {result.details_url && (
            <a
              href={result.details_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 hover:text-primary-700"
            >
              <ExternalLink className="w-3 h-3" />
              المصدر
            </a>
          )}
        </div>

        {/* Relevance score */}
        {relevance != null && (
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke="#0c8ee8"
                  strokeWidth="4"
                  strokeDasharray={`${relevance * 150.8} 150.8`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                {Math.round(relevance * 100)}٪
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">تطابق</span>
          </div>
        )}
      </div>
    </div>
  );
}
