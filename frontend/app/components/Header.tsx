'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, User, LayoutDashboard, Menu, X, ChevronDown, Search, Briefcase, Building2, Bookmark, FileText, CreditCard, LifeBuoy, BookOpen } from 'lucide-react';
import AuthModal from '../AuthModal';

interface AuthUser {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
}

const APP_LINKS = [
  { href: '/search', label: 'البحث', icon: Search },
  { href: '/cases', label: 'القضايا', icon: Briefcase },
  { href: '/firm', label: 'المكتب', icon: Building2 },
  { href: '/studies', label: 'الدراسات', icon: FileText },
  { href: '/favorites', label: 'المفضلة', icon: Bookmark },
  { href: '/guide', label: 'الدليل', icon: BookOpen },
];

function HeaderInner({ showSearchLink = true }: { showSearchLink?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try {
        setAuthUser(JSON.parse(saved));
      } catch {}
    }
    if (searchParams.get('signup') === '1') {
      setShowAuthModal(true);
    }
  }, [searchParams]);

  // Close account dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setShowAuthModal(false);
    router.push('/search');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthUser(null);
    setAccountOpen(false);
    router.push('/');
  };

  const isAdmin = authUser?.phone === '966514789632';
  const isLoggedIn = !!authUser;

  return (
    <>
      <header className="bg-white border-b border-ink-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <a href={isLoggedIn ? '/search' : '/'} className="flex items-center gap-2.5">
              <span className="bg-primary-700 rounded-lg px-3 py-1.5" style={{ fontFamily: 'B-Fantezy, var(--font-amiri), Amiri, serif' }}>
                <span className="text-lg font-bold text-white leading-none">الباحث</span>
              </span>
            </a>

            {/* App navigation — logged in users get the product nav only */}
            {isLoggedIn ? (
              <nav className="hidden md:flex items-center gap-1">
                {APP_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 transition-colors"
                  >
                    <link.icon className="w-4 h-4 text-ink-400" />
                    {link.label}
                  </a>
                ))}
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-1">
                <a href="/#platform" className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 transition-colors">المنصة</a>
                <a href="/#firms" className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 transition-colors">للمكاتب والشركات</a>
                <a href="/pricing" className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 transition-colors">الأسعار</a>
                <a href="/guide" className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 transition-colors">دليل الاستخدام</a>
                <a href="/about" className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 transition-colors">عن الباحث</a>
              </nav>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-700 hover:text-primary-800 font-medium rounded-lg hover:bg-primary-50"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    لوحة التحكم
                  </button>
                )}

                {/* Account dropdown */}
                <div className="relative" ref={accountRef}>
                  <button
                    onClick={() => setAccountOpen((v) => !v)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-ink-800 text-white flex items-center justify-center text-sm font-semibold">
                      {authUser!.first_name?.[0] || 'م'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-ink-700 max-w-[120px] truncate">
                      {authUser!.first_name} {authUser!.last_name}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-ink-400 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {accountOpen && (
                    <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl border border-ink-100 shadow-card-hover py-1.5 z-50" dir="rtl">
                      <div className="px-4 py-2.5 border-b border-ink-100">
                        <p className="text-sm font-semibold text-ink-900">{authUser!.first_name} {authUser!.last_name}</p>
                        <p className="text-xs text-ink-400 mt-0.5" style={{ direction: 'ltr', textAlign: 'right' }}>{authUser!.phone}</p>
                      </div>
                      <div className="py-1">
                        <a href="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50">
                          <User className="w-4 h-4 text-ink-400" />
                          الحساب والاشتراك
                        </a>
                        <a href="/pricing" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50">
                          <CreditCard className="w-4 h-4 text-ink-400" />
                          الباقات والأسعار
                        </a>
                        <a href="/support" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50">
                          <LifeBuoy className="w-4 h-4 text-ink-400" />
                          الدعم الفني
                        </a>
                      </div>
                      <div className="border-t border-ink-100 pt-1">
                        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                          <LogOut className="w-4 h-4" />
                          تسجيل الخروج
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile menu button */}
                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-ink-600">
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <>
                <a href="/pricing" className="hidden sm:block px-4 py-2 text-sm font-medium text-ink-700 hover:text-ink-900 rounded-lg hover:bg-ink-50 transition-colors">
                  الأسعار
                </a>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-5 py-2 text-sm font-semibold bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
                >
                  تسجيل الدخول
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu — logged in */}
        {menuOpen && isLoggedIn && (
          <div className="md:hidden border-t border-ink-100 bg-white px-4 py-3 space-y-1">
            {APP_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="flex items-center gap-2.5 w-full py-2.5 px-2 text-sm text-ink-700 hover:text-primary-700 rounded-lg hover:bg-ink-50">
                <link.icon className="w-4 h-4 text-ink-400" />
                {link.label}
              </a>
            ))}
            {isAdmin && (
              <button
                onClick={() => { router.push('/admin'); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full py-2.5 px-2 text-sm text-primary-700 rounded-lg hover:bg-primary-50"
              >
                <LayoutDashboard className="w-4 h-4" />
                لوحة التحكم
              </button>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2.5 w-full py-2.5 px-2 text-sm text-red-600 rounded-lg hover:bg-red-50">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        )}
      </header>

      {showAuthModal && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
            if (searchParams.get('signup') === '1') {
              router.push('/');
            }
          }}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}

export default function Header({ showSearchLink = true }: { showSearchLink?: boolean }) {
  return (
    <Suspense fallback={
      <header className="bg-white border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="bg-primary-700 rounded-lg px-3 py-1.5" style={{ fontFamily: 'B-Fantezy, var(--font-amiri), Amiri, serif' }}>
            <span className="text-lg font-bold text-white leading-none">الباحث</span>
          </span>
        </div>
      </header>
    }>
      <HeaderInner showSearchLink={showSearchLink} />
    </Suspense>
  );
}
