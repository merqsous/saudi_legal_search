'use client';

import { useState } from 'react';
import { X, Phone, Loader2, User, CheckCircle, Mail } from 'lucide-react';
import { getVisitSource } from './components/VisitTracker';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: { id: number; phone: string; first_name: string; last_name: string }) => void;
}

type Step = 'identifier' | 'link-email' | 'verify' | 'name' | 'email';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export default function AuthModal({ onClose, onAuthSuccess }: AuthModalProps) {
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState(''); // email or phone the user typed
  const [verifyId, setVerifyId] = useState('');     // what verify-otp resolves (email, or phone via link)
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [unknownPhone, setUnknownPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInToken, setLoggedInToken] = useState<string | null>(null);

  const formatPhone = (val: string) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('966')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('00966')) cleaned = '0' + cleaned.slice(5);
    if (!cleaned.startsWith('0') && cleaned.startsWith('5')) cleaned = '0' + cleaned;
    if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    return cleaned;
  };

  const isEmailInput = identifier.includes('@');
  const isPhoneInput = !isEmailInput && /^[0-9+\s-]{9,}$/.test(identifier.trim());

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

  const handleSendCode = async () => {
    setError(null);
    const id = identifier.trim();
    if (!EMAIL_RE.test(id) && !(isPhoneInput && formatPhone(id).length === 10 && formatPhone(id).startsWith('05'))) {
      setError('أدخل بريداً إلكترونياً صحيحاً أو رقم جوال يبدأ بـ 05');
      return;
    }

    setLoading(true);
    try {
      const data = await sendOtp({ identifier: id });
      if (data.status === 'needs_email') {
        setUnknownPhone(!!data.unknown_phone);
        setEmail('');
        setStep('link-email');
        return;
      }
      setVerifyId(id);
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
      const data = await sendOtp({ identifier: identifier.trim(), email: e });
      // Verify with the provided email so the OTP row is found even for unknown phones
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
        // Prefill the phone if the user entered one earlier
        if (isPhoneInput && !phone) setPhone(formatPhone(identifier.trim()));
        setStep('name');
        return;
      }

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        if (!data.user.email && !data.admin) {
          setLoggedInToken(data.token);
          setEmail('');
          setStep('email');
          return;
        }
        onAuthSuccess(data.user);
      }
    } catch (e: any) {
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
        onAuthSuccess(data.user);
      }
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    setError(null);
    const token = loggedInToken || localStorage.getItem('auth_token');
    if (!token) return;
    if (!EMAIL_RE.test(email.trim())) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل حفظ البريد');
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onAuthSuccess(data.user);
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'فشل حفظ البريد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-ink-400 hover:text-ink-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <img src="/arabic-logo.svg" alt="شعار الباحث" className="w-10 h-10" width={40} height={40} />
          <h2 className="text-lg font-bold text-ink-900">تسجيل الدخول</h2>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Email or phone */}
        {step === 'identifier' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              أدخل بريدك الإلكتروني ليصلك رمز التحقق — أو رقم جوالك إذا كان حسابك مسجلاً به
            </p>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                placeholder="example@email.com أو 05xxxxxxxx"
                className="w-full pr-11 pl-4 py-3 text-base bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ direction: 'ltr' }}
                autoFocus
              />
            </div>
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              إرسال الرمز
            </button>
          </div>
        )}

        {/* Step 1b: Legacy phone account — collect email */}
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
              onClick={() => { setStep('identifier'); setEmail(''); }}
              className="w-full text-sm text-ink-500 hover:text-ink-700"
            >
              رجوع
            </button>
          </div>
        )}

        {/* Step 2: Verify code */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
              <CheckCircle className="w-4 h-4" />
              <span>تم إرسال الرمز إلى {maskedEmail}</span>
            </div>
            <p className="text-sm text-ink-600">أدخل رمز التحقق المرسل إلى بريدك الإلكتروني</p>
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
              onClick={() => { setStep('identifier'); setCode(''); }}
              className="w-full text-sm text-ink-500 hover:text-ink-700"
            >
              رجوع
            </button>
          </div>
        )}

        {/* Step 3: Name + phone (new users) */}
        {step === 'name' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">أدخل اسمك ورقم جوالك لإكمال إنشاء الحساب</p>
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
            <p className="text-xs text-ink-400">نستخدم جوالك للتواصل معك بخصوص حسابك فقط</p>
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

        {/* Step 4: Email (existing users without an email on file) */}
        {step === 'email' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              سجّل بريدك الإلكتروني ليصلك جديد الأحكام والعروض — يمكنك تخطي هذه الخطوة
            </p>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
                placeholder="example@lawfirm.com"
                className="w-full pr-11 pl-4 py-3 text-base bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ direction: 'ltr' }}
                autoFocus
              />
            </div>
            <button
              onClick={handleSaveEmail}
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              حفظ البريد
            </button>
            <button
              onClick={() => {
                const saved = localStorage.getItem('auth_user');
                if (saved) onAuthSuccess(JSON.parse(saved));
              }}
              className="w-full text-sm text-ink-500 hover:text-ink-700"
            >
              تخطي الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
