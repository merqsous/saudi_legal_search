'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, User, LayoutDashboard, Menu, X } from 'lucide-react';
import AuthModal from '../AuthModal';

interface AuthUser {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
}

function HeaderInner({ showSearchLink = true }: { showSearchLink?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setShowAuthModal(false);
    router.push('/search');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthUser(null);
    router.push('/');
  };

  const isAdmin = authUser?.phone === '966514789632';

  return (
    <>
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo + Account (right side in RTL) */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo-rounded.png" alt="الباحث" className="w-10 h-10 rounded-xl" width={40} height={40} />
          </a>
          {authUser && (
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <button
                onClick={() => router.push('/account')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                  {authUser.first_name?.[0] || 'م'}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {authUser.first_name} {authUser.last_name}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Nav links (left side in RTL) */}
        <div className="flex items-center gap-4">
          {showSearchLink && (
            <a href="/search" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary-600">البحث</a>
          )}
          <a href="/pricing" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-primary-600">الأسعار</a>
          <a href="/about" className="hidden md:block text-sm font-medium text-slate-600 hover:text-primary-600">عن الباحث</a>

          {authUser ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  لوحة التحكم
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
              {/* Mobile menu for account */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="sm:hidden"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && authUser && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2">
          <button
            onClick={() => { router.push('/account'); setMenuOpen(false); }}
            className="flex items-center gap-2 w-full py-2 text-sm text-slate-700 hover:text-primary-600"
          >
            <User className="w-4 h-4" />
            حسابي — {authUser.first_name} {authUser.last_name}
          </button>
          <a href="/search" className="block py-2 text-sm text-slate-700 hover:text-primary-600">البحث</a>
          <a href="/favorites" className="block py-2 text-sm text-slate-700 hover:text-primary-600">المفضلة</a>
          <a href="/studies" className="block py-2 text-sm text-slate-700 hover:text-primary-600">الدراسات</a>
          {isAdmin && (
            <button
              onClick={() => { router.push('/admin'); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full py-2 text-sm text-primary-600"
            >
              <LayoutDashboard className="w-4 h-4" />
              لوحة التحكم
            </button>
          )}
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
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo-rounded.png" alt="الباحث" className="w-10 h-10 rounded-xl" width={40} height={40} />
          </a>
        </div>
      </header>
    }>
      <HeaderInner showSearchLink={showSearchLink} />
    </Suspense>
  );
}
