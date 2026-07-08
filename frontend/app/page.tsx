'use client';

import { useState, useEffect } from 'react';
import { Scale, Phone, Loader2, User, MessageCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'verify' | 'name';

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  const handleSendCode = async () => {
    setError(null);
    if (phone.length !== 10 || !phone.startsWith('05')) {
      setError('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل إرسال الرمز');
      if (data.dev_code) setDevCode(data.dev_code);
      setStep('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (code.length !== 6) {
      setError('الرمز تجب أن يتكون من 6 أرقام');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, first_name: needsName ? firstName : undefined, last_name: needsName ? lastName : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل التحقق');
      if (data.status === 'new_user' && !data.token) {
        setNeedsName(true);
        setStep('name');
        setLoading(false);
        return;
      }
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        router.push('/search');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('يرجى إدخال الاسم الأول والأخير');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, first_name: firstName.trim(), last_name: lastName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل التسجيل');
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        router.push('/search');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التسجيل');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-3">
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{'الباحث'}</h1>
          <p className="text-sm text-slate-500 mt-1">{'بحث في الأحكام القضائية السعودية'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-50 text-primary-600">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {step === 'name' ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'phone' && 'أدخل رقم هاتفك للدخول أو إنشاء حساب'}
                {step === 'verify' && 'أدخل رمز التحقق المرسل عبر واتساب'}
                {step === 'name' && 'أكمل بياناتك للتسجيل'}
              </p>
            </div>
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
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                  placeholder="0501234567"
                  className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  dir="ltr"
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                {'إرسال الرمز'}
              </button>
            </div>
          )}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
                <CheckCircle className="w-4 h-4" />
                <span>{'تم إرسال الرمز إلى'} {phone}</span>
              </div>
              {devCode && (
                <div className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 text-center" dir="ltr">
                  {'رمز التحقق (وضع التطوير)'}: <span className="font-bold">{devCode}</span>
                </div>
              )}
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                placeholder="000000"
                className="w-full px-4 py-3 text-2xl text-center tracking-[0.5em] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                dir="ltr"
                inputMode="numeric"
                autoFocus
              />
              <button
                onClick={handleVerifyCode}
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {'تحقق'}
              </button>
              <button
                onClick={() => { setStep('phone'); setCode(''); setDevCode(null); setError(null); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                {'تغيير الرقم'}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  placeholder={'الاسم الأخير'}
                  className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  dir="rtl"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {'إنشاء الحساب'}
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          {'بتسجيل الدخول، أنت توافق على شروط الاستخدام'}
        </p>
      </div>
    </div>
  );
}
