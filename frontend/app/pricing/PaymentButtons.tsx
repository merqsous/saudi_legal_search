'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Apple, Smartphone, Loader2, CheckCircle, Lock, User } from 'lucide-react';

interface PaymentButtonsProps {
  plan: 'monthly' | 'annual';
  amount: number; // in halalas (1 SAR = 100)
  label: string;
  discountedLabel?: string;
  variant: 'primary' | 'outline';
}

export default function PaymentButtons({ plan, amount, label, discountedLabel, variant }: PaymentButtonsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'creditcard' | 'applepay' | 'samsungpay'>('creditcard');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Card form fields
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardMonth, setCardMonth] = useState('');
  const [cardYear, setCardYear] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setAuthToken(token);

    if (token) {
      fetch('/api/subscriptions/status', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.subscribed) setSubscribed(true); })
        .catch(() => {});
    }

    // Check for payment callback
    const paymentId = searchParams.get('payment_id') || searchParams.get('id');
    if (paymentId && token) {
      setLoading(true);
      fetch(`/api/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.status === 'paid') {
            setSubscribed(true);
          } else if (d.status === 'failed') {
            setError('فشل عملية الدفع. يرجى المحاولة مرة أخرى.');
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [searchParams, authToken]);

  const formatCardNumber = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  };

  const handlePayment = async () => {
    if (!authToken) {
      router.push('/?signup=1');
      return;
    }

    if (paymentMethod === 'creditcard') {
      if (!cardName.trim()) { setError('الرجاء إدخال الاسم على البطاقة'); return; }
      if (cardNumber.replace(/\s/g, '').length < 16) { setError('الرجاء إدخال رقم بطاقة صحيح'); return; }
      if (!cardMonth || !cardYear) { setError('الرجاء إدخال تاريخ انتهاء البطاقة'); return; }
      if (cardCvc.length < 3) { setError('الرجاء إدخال رمز CVC صحيح'); return; }
    }

    setLoading(true);
    setError(null);

    try {
      const source: Record<string, any> = { type: paymentMethod };

      if (paymentMethod === 'creditcard') {
        source.name = cardName.trim();
        source.number = cardNumber.replace(/\s/g, '');
        source.month = parseInt(cardMonth);
        source.year = parseInt(cardYear);
        source.cvc = parseInt(cardCvc);
      }

      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          amount,
          currency: 'SAR',
          description: `اشتراك ${plan === 'annual' ? 'سنوي' : 'شهري'} - الباحث`,
          plan,
          source,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'فشل إنشاء عملية الدفع');
      }

      const data = await res.json();

      if (data.status === 'paid') {
        setSubscribed(true);
      } else if (data.status === 'initiated') {
        const transactionUrl = data.source?.transaction_url;
        if (transactionUrl) {
          window.location.href = transactionUrl;
        } else {
          setError('لم يتم العثور على رابط التحقق');
        }
      } else if (data.status === 'failed') {
        setError(data.source?.message || 'فشل عملية الدفع');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ في الدفع');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="w-full py-3 bg-primary-50 text-primary-600 rounded-xl font-bold text-center flex items-center justify-center gap-2">
        <CheckCircle className="w-5 h-5" />
        مشترك
      </div>
    );
  }

  const baseClass = 'w-full py-3 rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2';
  const variantClass = variant === 'primary'
    ? 'bg-primary-600 text-white hover:bg-primary-700'
    : 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50';

  return (
    <div className="space-y-3">
      {/* Payment method selector */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => { setPaymentMethod('creditcard'); setShowForm(false); setError(null); }}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors ${
            paymentMethod === 'creditcard' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
          }`}
        >
          <CreditCard className="w-5 h-5 text-slate-600" />
          <span className="text-xs font-medium text-slate-600">بطاقة</span>
        </button>
        <button
          onClick={() => { setPaymentMethod('applepay'); setShowForm(false); setError(null); }}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors ${
            paymentMethod === 'applepay' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
          }`}
        >
          <Apple className="w-5 h-5 text-slate-900" />
          <span className="text-xs font-medium text-slate-600">Apple Pay</span>
        </button>
        <button
          onClick={() => { setPaymentMethod('samsungpay'); setShowForm(false); setError(null); }}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors ${
            paymentMethod === 'samsungpay' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
          }`}
        >
          <Smartphone className="w-5 h-5 text-slate-600" />
          <span className="text-xs font-medium text-slate-600">Samsung Pay</span>
        </button>
      </div>

      {/* Card input form */}
      {showForm && paymentMethod === 'creditcard' && (
        <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">الاسم على البطاقة</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">رقم البطاقة</label>
            <div className="relative">
              <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4111 1111 1111 1111"
                className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                dir="ltr"
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">الشهر</label>
              <input
                type="text"
                value={cardMonth}
                onChange={(e) => setCardMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="MM"
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                dir="ltr"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">السنة</label>
              <input
                type="text"
                value={cardYear}
                onChange={(e) => setCardYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="YYYY"
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                dir="ltr"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">CVC</label>
              <input
                type="text"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                dir="ltr"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={() => {
          if (!authToken) { router.push('/?signup=1'); return; }
          if (paymentMethod === 'creditcard' && !showForm) {
            setShowForm(true);
          } else {
            handlePayment();
          }
        }}
        disabled={loading}
        className={`${baseClass} ${variantClass} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> جاري المعالجة...</>
        ) : (
          <><Lock className="w-4 h-4" /> {discountedLabel || label}</>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}

      <p className="text-xs text-slate-600 text-center flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" />
        دفع آمن عبر Moyasar
      </p>
    </div>
  );
}
