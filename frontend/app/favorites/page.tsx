'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Loader2, ExternalLink, LogOut, LayoutDashboard, Trash2 } from 'lucide-react';
import { judgmentUrl } from '@/lib/slug';

interface FavoriteResult {
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
  favorited_at: string;
}

interface AuthUser {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');
    if (savedUser) {
      try { setAuthUser(JSON.parse(savedUser)); } catch {}
    }
    if (savedToken) {
      setAuthToken(savedToken);
      fetch('/api/favorites', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then((r) => r.json())
        .then((d) => setFavorites(d.favorites || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const removeFavorite = async (judgmentId: number) => {
    if (!authToken) return;
    setFavorites((prev) => prev.filter((f) => f.judgment_id !== judgmentId));
    try {
      await fetch(`/api/favorites/${judgmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  if (!authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">يجب تسجيل الدخول لعرض المفضلة</p>
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
              <span className="text-sm text-slate-600">{authUser.first_name} {authUser.last_name}</span>
              <button onClick={handleLogout} className="text-slate-600 hover:text-slate-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-slate-900">المفضلة</h2>
          <span className="text-sm text-slate-600 mr-2">({favorites.length})</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">لا توجد أحكام في المفضلة</p>
            <button
              onClick={() => router.push('/search')}
              className="mt-4 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
            >
              ابدأ البحث
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((result) => (
              <div key={result.judgment_id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700">
                            {result.court_level}
                          </span>
                        )}
                      </a>
                      <button
                        onClick={() => removeFavorite(result.judgment_id)}
                        className="ml-auto p-1 text-slate-300 hover:text-red-500 transition-colors"
                        title="إزالة من المفضلة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2" dir="rtl">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {result.case_number && (
                          <div>
                            <span className="text-slate-600">رقم القضية:</span>
                            <span className="font-medium text-slate-700 mr-1">{result.case_number}/{result.case_year ?? ''}</span>
                          </div>
                        )}
                        {result.judgment_number && (
                          <div>
                            <span className="text-slate-600">رقم الحكم:</span>
                            <span className="font-medium text-slate-700 mr-1">{result.judgment_number}</span>
                          </div>
                        )}
                        {result.judgment_date_hijri && (
                          <div>
                            <span className="text-slate-600">التاريخ:</span>
                            <span className="font-medium text-slate-700 mr-1">{result.judgment_date_hijri}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {result.details_url && (
                      <a
                        href={result.details_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                        المصدر
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
