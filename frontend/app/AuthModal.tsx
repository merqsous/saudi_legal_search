'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Loader2, User, CheckCircle } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth, recaptchaConfigPromise } from '../lib/firebase';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: { id: number; phone: string; first_name: string; last_name: string }) => void;
}

type Step = 'phone' | 'verify' | 'name';

export default function AuthModal({ onClose, onAuthSuccess }: AuthModalProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

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
    if (!(window as any).recaptchaVerifier) {
      const initRecaptcha = async () => {
        try {
          if (recaptchaConfigPromise) {
            await recaptchaConfigPromise;
            console.log('[AUTH MODAL] reCAPTCHA config ready');
          }
          (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-modal', {
            size: 'invisible',
            callback: () => {},
            'expired-callback': () => {
              if ((window as any).recaptchaWidgetId !== undefined && (window as any).grecaptcha) {
                (window as any).grecaptcha.reset((window as any).recaptchaWidgetId);
              }
            },
          });
          (window as any).recaptchaVerifier.render().then((widgetId: number) => {
            (window as any).recaptchaWidgetId = widgetId;
            (window as any).recaptchaReady = true;
            console.log('[AUTH MODAL] reCAPTCHA rendered, widgetId:', widgetId);
          }).catch((err: any) => {
            console.error('[AUTH MODAL] reCAPTCHA render error:', err);
          });
        } catch (e) {
          console.error('[AUTH MODAL] reCAPTCHA setup error:', e);
        }
      };
      initRecaptcha();
    }
  }, []);

  const handleSendCode = async () => {
    setError(null);
    if (phone.length !== 10 || !phone.startsWith('05')) {
      setError('رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
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
        setNeedsName(true);
        setStep('name');
        setLoading(false);
        return;
      }

      setNeedsName(false);
      await sendOtp();
    } catch (e: any) {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
        (window as any).recaptchaReady = false;
      }
      if (e.code === 'auth/too-many-requests') {
        setError('طلبات كثيرة، حاول لاحقاً');
      } else if (e.code === 'auth/captcha-check-failed') {
        setError('فشل التحقق، أعد المحاولة');
      } else if (e.code === 'auth/invalid-app-credential') {
        setError('فشل التحقق، أعد المحاولة');
      } else {
        setError(e instanceof Error ? e.message : 'فشل إرسال الرمز');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!(window as any).recaptchaVerifier) {
      setError('يرجى إعادة المحاولة');
      return;
    }
    for (let i = 0; i < 10; i++) {
      if ((window as any).recaptchaReady) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!(window as any).recaptchaReady) {
      setError('فشل تحميل التحقق، أعد المحاولة');
      return;
    }
    const internationalPhone = toInternational(phone);
    const result = await signInWithPhoneNumber(auth, internationalPhone, (window as any).recaptchaVerifier);
    setConfirmationResult(result);
    setStep('verify');
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
          first_name: needsName ? firstName : undefined,
          last_name: needsName ? lastName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل التحقق');

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        onAuthSuccess(data.user);
      }
    } catch (e: any) {
      if (e.code === 'auth/invalid-verification-code') {
        setError('رمز التحقق غير صحيح');
      } else if (e.code === 'auth/code-expired') {
        setError('انتهت صلاحية الرمز، أعد المحاولة');
      } else {
        setError(e instanceof Error ? e.message : 'فشل التحقق');
      }
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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <img src="/logo-rounded.png" alt="الباحث" className="w-10 h-10 rounded-xl" />
          <h2 className="text-lg font-bold text-slate-900">تسجيل الدخول</h2>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Phone */}
        {step === 'phone' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">أدخل رقم هاتفك السعودي لتصلك رمز التحقق عبر SMS</p>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                placeholder="0501234567"
                className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ direction: 'ltr' }}
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

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
              <CheckCircle className="w-4 h-4" />
              <span>تم إرسال الرمز إلى {phone}</span>
            </div>
            {devCode && (
              <div className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 text-center" dir="ltr">
                رمز التحقق (وضع التطوير): <span className="font-bold">{devCode}</span>
              </div>
            )}
            <p className="text-sm text-slate-600">أدخل رمز التحقق المرسل إلى هاتفك</p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
              placeholder="000000"
              className="w-full px-4 py-3 text-2xl text-center tracking-[0.5em] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{ direction: 'ltr' }}
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
              onClick={() => { setStep('phone'); setCode(''); setDevCode(null); setConfirmationResult(null); }}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              تغيير الرقم
            </button>
          </div>
        )}

        {/* Step 3: Name (new users) */}
        {step === 'name' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">أدخل اسمك لإكمال إنشاء الحساب</p>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="الاسم الأول"
                className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ direction: 'rtl' }}
              />
            </div>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="الاسم الأخير"
                className="w-full pr-11 pl-4 py-3 text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                style={{ direction: 'rtl' }}
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              إرسال رمز التحقق
            </button>
          </div>
        )}
      </div>
      <div id="recaptcha-container-modal" style={{ direction: 'ltr' }} />
    </div>
  );
}
