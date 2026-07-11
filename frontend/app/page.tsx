'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useState, useEffect } from 'react';
import { Scale, Phone, Loader2, User, CheckCircle, ShieldCheck, Search, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'name' | 'verify';
type View = 'landing' | 'auth';

export default function LandingPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('landing');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaExpected, setCaptchaExpected] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try {
        JSON.parse(saved);
        router.push('/search');
        return;
      } catch {}
    }
    setCheckingAuth(false);
  }, [router]);

  const startSearch = () => {
    router.push('/search');
  };

  const formatPhone = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('966')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('00966')) cleaned = '0' + cleaned.slice(5);
    if (!cleaned.startsWith('0') && cleaned.startsWith('5')) cleaned = '0' + cleaned;
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    return cleaned;
  };

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptchaQuestion(`${a} + ${b} = ?`);
    setCaptchaExpected(a + b);
    setCaptchaAnswer('');
  };

  const ADMIN_PHONE = '0514789632';

  const handlePhoneSubmit = async () => {
    setError(null);
    if (phone.length !== 10 || !phone.startsWith('05')) {
      setError('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }

    // Admin bypass
    if (phone === ADMIN_PHONE) {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'فشل تسجيل الدخول');
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          router.push('/search');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'فشل تسجيل الدخول');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      // Check if user exists
      const checkRes = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const checkData = await checkRes.json();

      if (checkData.is_new) {
        setIsNewUser(true);
        setStep('name');
      } else {
        // Existing user - go straight to human verification
        setIsNewUser(false);
        generateCaptcha();
        setStep('verify');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('يرجى إدخال الاسم الأول والأخير');
      return;
    }
    generateCaptcha();
    setStep('verify');
  };

  const handleLogin = async () => {
    setError(null);
    if (parseInt(captchaAnswer) !== captchaExpected) {
      setError('الإجابة غير صحيحة. حاول مرة أخرى.');
      generateCaptcha();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          first_name: isNewUser ? firstName.trim() : undefined,
          last_name: isNewUser ? lastName.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل تسجيل الدخول');
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        router.push('/search');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600 text-white">
                <Scale className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">الباحث</h1>
            </div>
            <button
              onClick={() => setView('auth')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2"
            >
              تسجيل الدخول
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              محرك بحث ذكي في<br />الأحكام القضائية السعودية
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              ابحث بذكاء في آلاف الأحكام من محاكم الدرجة الأولى ومحكمة الاستئناف. تجربة مجانية تتيح لك 3 عمليات بحث.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={startSearch}
                className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                ابحث الآن
              </button>
              <button
                onClick={() => setView('auth')}
                className="w-full sm:w-auto px-8 py-4 border-2 border-primary-600 text-primary-600 rounded-xl font-bold text-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
              >
                إنشاء حساب مجاني
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
              <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">بحث ذكي</h3>
              <p className="text-sm text-slate-600">ابحث بالمعنى لا بالكلمة المفتاحية فقط</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">أحكام موثوقة</h3>
              <p className="text-sm text-slate-600">أحكام من محاكم المملكة العربية السعودية</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">مجاني للتجربة</h3>
              <p className="text-sm text-slate-600">3 عمليات بحث مجانية بدون تسجيل</p>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
            الباحث — بحث في الأحكام القضائية السعودية
            <div className="mt-2">
              <a href="mailto:albahethapp@gmail.com" className="text-primary-600 hover:text-primary-700">albahethapp@gmail.com</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-3">
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{'الباحث'}</h1>
          <p className="text-sm text-slate-500 mt-1">{'بحث في الأحكام القضائية السعودية'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-50 text-primary-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {step === 'name' ? 'إنشاء حساب' : 'تسجيل الدخول'}
                </h2>
                <p className="text-xs text-slate-500">
                  {step === 'phone' && 'أدخل رقم هاتفك للدخول أو إنشاء حساب'}
                  {step === 'verify' && 'تأكيد أنك لست روبوت'}
                  {step === 'name' && 'أكمل بياناتك للتسجيل'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setView('landing')}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              رجوع
            </button>
          </div>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                  placeholder="0501234567"
                  className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  dir="ltr"
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              <button
                onClick={handlePhoneSubmit}
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {'متابعة'}
              </button>
            </div>
          )}
          {step === 'name' && (
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={'الاسم الأول'}
                  className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  dir="rtl"
                  autoFocus
                />
              </div>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  placeholder={'الاسم الأخير'}
                  className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  dir="rtl"
                />
              </div>
              <button
                onClick={handleNameSubmit}
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {'متابعة'}
              </button>
            </div>
          )}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                <ShieldCheck className="w-5 h-5 text-primary-600" />
                <span>{'أكد أنك لست روبوت'}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500 mb-2">{'حل العملية الحسابية التالية:'}</p>
                <p className="text-2xl font-bold text-slate-900" dir="ltr">{captchaQuestion}</p>
              </div>
              <input
                type="text"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="الإجابة"
                className="w-full px-4 py-3 text-xl text-center bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="ltr"
                inputMode="numeric"
                autoFocus
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {'دخول'}
              </button>
              <button
                onClick={() => { setStep('phone'); setCaptchaAnswer(''); setError(null); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                {'تغيير الرقم'}
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          {'بتسجيل الدخول، أنت توافق على شروط الاستخدام'}
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">
          {'للتواصل: '}
          <a href="mailto:albahethapp@gmail.com" className="text-primary-600 hover:text-primary-700">albahethapp@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
