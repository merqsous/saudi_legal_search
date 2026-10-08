'use client';

import { useState, useEffect } from 'react';
import { Phone, Loader2, User, CheckCircle, X, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getVisitSource } from './VisitTracker';

type Step = 'identifier' | 'link-email' | 'name' | 'verify';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export default function LandingAuth() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [verifyId, setVerifyId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [unknownPhone, setUnknownPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [code, setCode] = useState('');

  const searchParams = useSearchParams();

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
    if (searchParams.get('signup') === '1') {
      setShowAuth(true);
    }
  }, [router, searchParams]);

  const formatPhone = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('966')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('00966')) cleaned = '0' + cleaned.slice(5);
    if (!cleaned.startsWith('0') && cleaned.startsWith('5')) cleaned = '0' + cleaned;
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    return cleaned;
  };

  const ADMIN_PHONE = '0514789632';

  const sendOtp = async (body: Record<string, string>) => {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'فشل إرسال رمز التحقق');
    return data;
  };

  const handleIdentifierSubmit = async () => {
    setError(null);
    const id = identifier.trim();
    const isEmail = EMAIL_RE.test(id);
    const fmtPhone = formatPhone(id);
    const isPhone = !isEmail && /^[0-9+\s-]{9,}$/.test(id) && fmtPhone.length === 10 && fmtPhone.startsWith('05');
    if (!isEmail && !isPhone) {
      setError('أدخل بريداً إلكترونياً صحيحاً أو رقم جوال يبدأ بـ 05');
      return;
    }

    if (isPhone && fmtPhone === ADMIN_PHONE) {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: fmtPhone }),
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
      const data = await sendOtp({ identifier: isPhone ? fmtPhone : id });
      if (data.status === 'needs_email') {
        setUnknownPhone(!!data.unknown_phone);
        setEmail('');
        setStep('link-email');
        return;
      }
      if (isPhone) setPhone(fmtPhone);
      setVerifyId(isPhone ? fmtPhone : id);
      setMaskedEmail(data.masked_email || '');
      setCode('');
      setStep('verify');
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'فشل إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkEmail = async () => {
    setError(null);
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    setLoading(true);
    try {
      const data = await sendOtp({ identifier: formatPhone(identifier.trim()), email: e });
      setVerifyId(e);
      setMaskedEmail(data.masked_email || e);
      setCode('');
      setStep('verify');
    } catch (e2: any) {
      setError(e2 instanceof Error ? e2.message : 'فشل إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (code.length !== 4) {
      setError('الرمز يجب أن يتكون من 4 أرقام');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: verifyId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل التحقق');

      if (data.status === 'needs_registration') {
        setStep('name');
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
    if (phone.length !== 10 || !phone.startsWith('05')) {
      setError('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: verifyId,
          code,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone,
          ...getVisitSource(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل إنشاء الحساب');
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        router.push('/search');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const subtitle = {
    'identifier': 'أدخل بريدك الإلكتروني للدخول أو إنشاء حساب',
    'link-email': 'أدخل بريدك الإلكتروني ليصلك رمز التحقق',
    'verify': 'أدخل رمز التحقق المرسل إلى بريدك',
    'name': 'أدخل اسمك ورقم جوالك لإكمال إنشاء الحساب',
  }[step];

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
                setShowAuth(false); setStep('identifier'); setError(null); setCode('');
              }}
              className="absolute top-4 left-4 text-ink-400 hover:text-ink-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-6">
              <img src="/arabic-logo.svg" alt="شعار الباحث" className="w-14 h-14 mb-3" width={56} height={56} />
              <h2 className="text-xl font-bold text-ink-900">
                {step === 'name' ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </h2>
              <p className="text-xs text-ink-500 mt-1">{subtitle}</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {step === 'identifier' && (
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleIdentifierSubmit()}
                    placeholder="example@email.com أو 05xxxxxxxx"
                    className="w-full pr-11 pl-4 py-3 text-base bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'ltr' }}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-ink-400">إذا كان حسابك القديم مسجلاً برقم الجوال، أدخل الرقم وسنطلب بريدك</p>
                <button
                  onClick={handleIdentifierSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  متابعة
                </button>
              </div>
            )}

            {step === 'link-email' && (
              <div className="space-y-4">
                <p className="text-sm text-ink-600">
                  {unknownPhone
                    ? 'لا يوجد حساب بهذا الرقم — أدخل بريدك الإلكتروني لإنشاء حساب جديد'
                    : 'حسابك مسجل برقم الجوال — أدخل بريدك الإلكتروني ليصلك رمز التحقق'}
                </p>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLinkEmail()}
                    placeholder="example@email.com"
                    className="w-full pr-11 pl-4 py-3 text-base bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'ltr' }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleLinkEmail}
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  إرسال الرمز
                </button>
                <button
                  onClick={() => { setStep('identifier'); setEmail(''); setError(null); }}
                  className="w-full text-sm text-ink-500 hover:text-ink-700"
                >
                  رجوع
                </button>
              </div>
            )}

            {step === 'name' && (
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="الاسم الأول"
                    className="w-full pr-11 pl-4 py-3 text-base bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'rtl' }}
                    autoFocus
                  />
                </div>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="الاسم الأخير"
                    className="w-full pr-11 pl-4 py-3 text-base bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'rtl' }}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    placeholder="05xxxxxxxx"
                    className="w-full pr-11 pl-4 py-3 text-base bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ direction: 'ltr' }}
                  />
                </div>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  إنشاء الحساب
                </button>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4" />
                  <span>تم إرسال رمز التحقق إلى {maskedEmail}</span>
                </div>
                <p className="text-xs text-ink-400">لم يصلك؟ تحقق من مجلد الرسائل غير المرغوب فيها أو تبويب العروض (Promotions)</p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                  placeholder="0000"
                  className="w-full px-4 py-3 text-2xl text-center tracking-[0.5em] bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  onClick={() => { setStep('identifier'); setCode(''); setError(null); }}
                  className="w-full text-sm text-ink-500 hover:text-ink-700"
                >
                  رجوع
                </button>
              </div>
            )}

            <p className="text-center text-xs text-ink-400 mt-4">
              بتسجيل الدخول، أنت توافق على شروط الاستخدام
            </p>
          </div>
        </div>
      )}
    </>
  );
}
