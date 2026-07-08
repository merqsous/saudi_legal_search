'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ExternalLink, Scale, Filter, X, ChevronDown, Sparkles, LogOut } from 'lucide-react';

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

export default function SearchPage() {
  const router = useRouter();
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
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try { setAuthUser(JSON.parse(saved)); } catch {}
    } else {
      router.push('/');
      return;
    }
    fetch('/api/filters')
      .then((r) => r.json())
      .then((data) => setFilters(data))
      .catch(() => {});
  }, [router]);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);

    const params = new URLSearchParams({ q: query, limit: '20' });
    if (selectedCourtType) params.set('court_type', selectedCourtType);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedYear) params.set('year', selectedYear);
    if (selectedCourtLevel) params.set('court_level', selectedCourtLevel);

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: SearchResponse = await res.json();
      setResults(data.results);
      setTotal(data.total);
      setAiAnswer(null);

      setAiLoading(true);
      fetch(`/api/ai-answer?${new URLSearchParams({ q: query, limit: '20' })}`)
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
  }, [query, selectedCourtType, selectedCity, selectedYear, selectedCourtLevel]);

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

  const clearFilters = () => {
    setSelectedCourtType('');
    setSelectedCity('');
    setSelectedYear('');
    setSelectedCourtLevel('');
  };

  const activeFilterCount =
    (selectedCourtType ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedYear ? 1 : 0) +
    (selectedCourtLevel ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600 text-white">
            <Scale className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">الباحث</h1>
          <div className="flex-1" />
          {authUser && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{authUser.first_name} {authUser.last_name}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="relative">
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
              <div className="mb-4 bg-gradient-to-l from-primary-50 to-white border border-primary-200 rounded-xl p-5">
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
            <div className="space-y-3">
              {results.map((result, idx) => (
                <ResultCard key={`${result.judgment_id}-${idx}`} result={result} />
              ))}
            </div>
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

function ResultCard({ result }: { result: SearchResult }) {
  const relevance = result.distance != null ? Math.max(0, 1 - result.distance) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
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
          </div>

          {/* Case info */}
          <div className="text-sm text-slate-600 mb-2" dir="rtl">
            {result.case_number && (
              <span>القضية: {result.case_number}/{result.case_year ?? ''}</span>
            )}
            {result.judgment_number && (
              <span className="mr-3">الحكم: {result.judgment_number}</span>
            )}
            {result.judgment_date_hijri && (
              <span className="mr-3 text-slate-400">التاريخ: {result.judgment_date_hijri}</span>
            )}
          </div>

          {/* Snippet */}
          <p className="text-sm text-slate-700 leading-relaxed arabic-text" dir="rtl">
            {result.snippet}
          </p>

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
