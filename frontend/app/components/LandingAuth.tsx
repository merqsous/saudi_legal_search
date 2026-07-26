'use client';

import { useState, useEffect } from 'react';
import { Phone, Loader2, User, CheckCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../../lib/firebase';

type Step = 'phone' | 'name' | 'verify';

export default function LandingAuth() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

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

  const formatPhone = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('966')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('00966')) cleaned = '0' + cleaned.slice(5);
    if (!cleaned.startsWith('0') && cleaned.startsWith('5')) cleaned = '0' + cleaned;
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    return cleaned;
  };

  const toInternational = (localPhone: string) => {
    let cleaned = localPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '966' + cleaned.slice(1);
    return '+' + cleaned;
  };

  useEffect(() => {
    if (showAuth && !(window as any).recaptchaVerifier) {
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        console.error('reCAPTCHA container not found in DOM');
        return;
      }
      try {
        console.log('[AUTH] Initializing reCAPTCHA...');
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (token: string) => {
            console.log('[AUTH] reCAPTCHA solved, token length:', token?.length);
          },
          'expired-callback': () => {
            console.log('[AUTH] reCAPTCHA expired');
            if ((window as any).recaptchaWidgetId !== undefined && (window as any).grecaptcha) {
              (window as any).grecaptcha.reset((window as any).recaptchaWidgetId);
            }
          },
          'error-callback': (err: any) => {
            console.error('[AUTH] reCAPTCHA error-callback:', err);
          }
        });
        (window as any).recaptchaVerifier.render().then((widgetId: number) => {
          (window as any).recaptchaWidgetId = widgetId;
          (window as any).recaptchaReady = true;
          console.log('[AUTH] reCAPTCHA rendered, widgetId:', widgetId);
        }).catch((err: any) => {
          console.error('[AUTH] reCAPTCHA render error:', err);
        });
      } catch (e) {
        console.error('[AUTH] reCAPTCHA setup error:', e);
      }
    }
  }, [showAuth]);

  const sendOtp = async () => {
    if (!(window as any).recaptchaVerifier) {
      console.error('[AUTH] No recaptchaVerifier available');
      setError('يرجى إعادة المحاولة');
      return;
    }
    // Poll for reCAPTCHA ready up to 5 seconds
    for (let i = 0; i < 10; i++) {
      if ((window as any).recaptchaReady) break;
      console.log('[AUTH] Waiting for reCAPTCHA ready...', i);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!(window as any).recaptchaReady) {
      console.error('[AUTH] reCAPTCHA not ready after 5s');
      setError('فشل تحميل التحقق، أعد المحاولة');
      return;
    }
    const internationalPhone = toInternational(phone);
    console.log('[AUTH] Sending OTP to:', internationalPhone);
    const result = await signInWithPhoneNumber(auth, internationalPhone, (window as any).recaptchaVerifier);
    console.log('[AUTH] OTP sent successfully, confirmationResult:', !!result);
    setConfirmationResult(result);
    setStep('verify');
  };

  const ADMIN_PHONE = '0514789632';

  const handlePhoneSubmit = async () => {
    setError(null);
    if (phone.length !== 10 || !phone.startsWith('05')) {
      setError('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }

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
      const checkRes = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const checkData = await checkRes.json();

      if (checkData.is_new) {
        setIsNewUser(true);
        setStep('name');
        setLoading(false);
        return;
      }

      setIsNewUser(false);
      await sendOtp();
    } catch (e: any) {
      console.error('[AUTH] handlePhoneSubmit error:', e?.code, e?.message, e);
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
        (window as any).recaptchaReady = false;
      }
      if (e.code === 'auth/too-many-requests') {
        setError('طلبات كثيرة، حاول لاحقاً');
      } else if (e.code === 'auth/captcha-check-failed') {
        setError('فشل التحقق، أعد المحاولة');
      } else if (e.code === 'auth/invalid-phone-number') {
        setError('رقم الهاتف غير صحيح');
      } else if (e.code === 'auth/invalid-app-credential') {
        setError('فشل التحقق، أعد المحاولة');
      } else if (e.code === 'auth/operation-not-allowed') {
        setError('المصادقة بالهاتف غير مفعلة في Firebase');
      } else if (e.code === 'auth/quota-exceeded') {
        setError('تم تجاوز حصة الرسائل، حاول لاحقاً');
      } else if (e.code === 'auth/network-request-failed') {
        setError('خطأ في الشبكة، تحقق من اتصالك');
      } else {
        setError(e instanceof Error ? e.message : 'فشل إرسال الرمز');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('يرجى إدخال الاسم الأول والأخير');
      return;
    }
    setLoading(true);
    try {
      await sendOtp();
    } catch (e: any) {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
        (window as any).recaptchaReady = false;
      }
      if (e.code === 'auth/too-many-requests') {
        setError('طلبات كثيرة، حاول لاحقاً');
      } else if (e.code === 'auth/invalid-app-credential') {
        setError('فشل التحقق، أعد المحاولة');
      } else {
        setError(e instanceof Error ? e.message : 'فشل إرسال رمز التحقق');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (code.length !== 6) {
      setError('الرمز يجب أن يتكون من 6 أرقام');
      return;
    }

    setLoading(true);
    try {
      if (!confirmationResult) {
        setError('لم يتم إرسال الرمز، أعد المحاولة');
        setLoading(false);
        return;
      }

      await confirmationResult.confirm(code);

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

  return (
    <>
      <button
        onClick={() => setShowAuth(true)}
        className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2"
      >
        تسجيل الدخول
      </button>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 relative">
            <button
              onClick={() => {
                setShowAuth(false); setStep('phone'); setError(null); setCode('');
                if ((window as any).recaptchaVerifier) {
                  (window as any).recaptchaVerifier.clear();
                  (window as any).recaptchaVerifier = null;
                }
              }}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-6">
              <img src="/logo-rounded.png" alt="الباحث" className="w-14 h-14 rounded-2xl mb-3" />
              <h2 className="text-xl font-bold text-slate-900">
                {step === 'name' ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {step === 'phone' && 'أدخل رقم هاتفك للدخول أو إنشاء حساب'}
                {step === 'verify' && 'أدخل رمز التحقق المرسل إلى هاتفك'}
                {step === 'name' && 'أدخل اسمك لإكمال إنشاء الحساب'}
              </p>
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
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                    placeholder="0501234567"
                    className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'ltr' }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handlePhoneSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  متابعة
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
                    placeholder="الاسم الأول"
                    className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'rtl' }}
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
                    placeholder="الاسم الأخير"
                    className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'rtl' }}
                  />
                </div>
                <button
                  onClick={handleNameSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  إرسال رمز التحقق
                </button>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4" />
                  <span>تم إرسال رمز التحقق إلى {phone}</span>
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-2xl text-center tracking-[0.5em] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ direction: 'ltr' }}
                  autoFocus
                />
                <button
                  onClick={handleVerifyCode}
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  تحقق
                </button>
                <button
                  onClick={() => { setStep('phone'); setCode(''); setError(null); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700"
                >
                  تغيير الرقم
                </button>
              </div>
            )}

            <p className="text-center text-xs text-slate-400 mt-4">
              بتسجيل الدخول، أنت توافق على شروط الاستخدام
            </p>
          </div>
        </div>
      )}
      <div id="recaptcha-container" style={{ direction: 'ltr' }} />
    </>
  );
}
