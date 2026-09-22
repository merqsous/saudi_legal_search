'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ArrowLeft, Loader2, MapPin, Sparkles, Briefcase, Users, Building2, FileText } from 'lucide-react';
import { judgmentUrl } from '@/lib/slug';

interface HeroResult {
  judgment_id: number;
  judgment_number: string | null;
  judgment_date_hijri: string | null;
  court_type: string | null;
  city: string | null;
  court_level: string | null;
  snippet: string;
}

const EXAMPLE_QUERIES = [
  'تعويض عن إنهاء عقد عمل غير محدد المدة',
  'دعوى مطالبة بقيمة شيك',
  'حضانة الطفل بعد الطلاق',
  'إخلاء مأجور لعدم سداد الإيجار',
  'فسخ عقد بيع لعدم مطابقة المواصفات',
];

export default function HeroSearch() {
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState('');
  const [exampleIdx, setExampleIdx] = useState(0);
  const [results, setResults] = useState<HeroResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter cycling through example queries (until the user types)
  useEffect(() => {
    if (query || searched) return;
    const example = EXAMPLE_QUERIES[exampleIdx];
    let i = 0;
    let deleting = false;
    const timer = setInterval(() => {
      if (!deleting) {
        i++;
        setTyping(example.slice(0, i));
        if (i >= example.length) {
          deleting = true;
          clearInterval(timer);
          setTimeout(() => {
            const del = setInterval(() => {
              i--;
              setTyping(example.slice(0, Math.max(0, i)));
              if (i <= 0) {
                clearInterval(del);
                setExampleIdx((v) => (v + 1) % EXAMPLE_QUERIES.length);
              }
            }, 18);
          }, 2200);
        }
      }
    }, 65);
    return () => clearInterval(timer);
  }, [exampleIdx, query, searched]);

  const doSearch = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text || loading) return;
    setQuery(text);
    setSearched(true);
    setLoading(true);
    setError(false);
    setResults(null);
    try {
      const res = await fetch(`/api/search?anonymous=true&limit=3&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error();
      setResults(data.results || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const highlight = (text: string) => {
    const words = query.trim().split(/\s+/).filter((w) => w.length >= 3);
    if (!words.length) return text;
    const parts = text.split(new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g'));
    return parts.map((part, i) =>
      words.includes(part) ? (
        <mark key={i} className="bg-primary-100 text-primary-900 rounded px-0.5">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-full shadow-brand border border-white/20 overflow-hidden h-14 md:h-16">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            className="flex-1 h-full px-6 md:px-8 text-base md:text-lg text-ink-900 bg-transparent focus:outline-none placeholder:text-ink-400"
            placeholder={typing || 'اسأل عن أي قضية…'}
            dir="rtl"
            aria-label="ابحث في الأحكام القضائية"
          />
          <button
            onClick={() => doSearch()}
            disabled={loading || !query.trim()}
            className="h-full px-6 md:px-8 bg-primary-700 text-white flex items-center gap-2 font-bold hover:bg-primary-600 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span className="hidden md:inline">ابحث</span>
          </button>
        </div>
      </div>

      {/* Example chips — ChatGPT-style quick starts */}
      {!searched && (
        <div className="flex flex-wrap justify-center gap-2.5 mt-6">
          {[
            { label: 'قضايا العمل', query: 'تعويض عن إنهاء عقد عمل غير محدد المدة', icon: Briefcase },
            { label: 'الأحوال الشخصية', query: 'حضانة الطفل بعد الطلاق', icon: Users },
            { label: 'قضايا تجارية', query: 'دعوى مطالبة بقيمة شيك', icon: Building2 },
            { label: 'عقود وإيجارات', query: 'إخلاء مأجور لعدم سداد الإيجار', icon: FileText },
          ].map((c) => (
            <button
              key={c.label}
              onClick={() => doSearch(c.query)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm bg-white/5 text-primary-100 border border-white/15 rounded-full hover:bg-white/10 hover:text-white hover:border-white/25 transition-colors"
              dir="rtl"
            >
              <c.icon className="w-4 h-4 text-primary-300" />
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Live results */}
      {(loading || results || error) && (
        <div className="mt-6 bg-white rounded-[30px] shadow-brand p-5 md:p-6" dir="rtl">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-10">
              <Loader2 className="w-5 h-5 text-primary-700 animate-spin" />
              <p className="text-sm text-ink-500">المحرك يفهم معنى استعلامك ويبحث في الأحكام…</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-ink-500 mb-3">تعذر تنفيذ البحث الآن — جرّب مرة أخرى</p>
              <button onClick={() => doSearch()} className="text-sm text-primary-700 font-bold hover:underline">
                إعادة المحاولة
              </button>
            </div>
          )}

          {results && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-ink-500 mb-1">لا توجد نتائج مطابقة لهذا الاستعلام في المعاينة</p>
              <p className="text-xs text-ink-400">سجّل الدخول للبحث الكامل بالمعنى في جميع الأحكام</p>
            </div>
          )}

          {results && results.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary-700" />
                <p className="text-xs font-bold text-primary-700">
                  أول 3 نتائج من بحث المعنى — أحكام حقيقية من قاعدة البيانات
                </p>
              </div>
              <div className="space-y-3">
                {results.map((r) => (
                  <a
                    key={r.judgment_id}
                    href={judgmentUrl(r.judgment_id, {
                      court_type: r.court_type,
                      court_level: r.court_level,
                      city: r.city,
                      judgment_number: r.judgment_number,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-ink-100 rounded-2xl p-4 hover:border-primary-300 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {r.court_type && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 font-semibold">
                          {r.court_type}
                        </span>
                      )}
                      {r.city && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-ink-50 text-ink-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {r.city}
                        </span>
                      )}
                      {r.judgment_date_hijri && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-sand-100 text-sand-700">{r.judgment_date_hijri}</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-ink-800 mb-1 group-hover:text-primary-800 transition-colors">
                      حكم رقم {r.judgment_number || r.judgment_id}
                    </p>
                    <p className="text-xs text-ink-500 leading-relaxed line-clamp-2">{highlight(r.snippet)}</p>
                    <div className="flex items-center gap-1 mt-2 text-primary-700 text-xs font-bold">
                      اقرأ الحكم كاملاً
                      <ArrowLeft className="w-3 h-3" />
                    </div>
                  </a>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <p className="text-xs text-ink-400">المعاينة مجانية بدون تسجيل</p>
                <a href="/search" className="text-xs font-bold text-primary-700 hover:underline flex items-center gap-1">
                  سجّل للبحث الكامل
                  <ArrowLeft className="w-3 h-3" />
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
