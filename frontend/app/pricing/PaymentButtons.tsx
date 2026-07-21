'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Apple, Smartphone, Loader2, CheckCircle, Lock } from 'lucide-react';

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
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [searchParams, authToken]);

  const handlePayment = async () => {
    if (!authToken) {
      router.push('/?signup=1');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          amount,
          currency: 'SAR',
          description: `اشتراك ${plan === 'annual' ? 'سنوي' : 'شهري'} - الباحث`,
          plan,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Payment creation failed');
      }

      const data = await res.json();

      // Redirect to Moyasar payment page
      if (data.source_url || data.url) {
        window.location.href = data.source_url || data.url;
      } else if (data.id) {
        // Fallback: redirect to Moyasar hosted checkout
        window.location.href = `https://checkout.moyasar.com/payment/${data.id}`;
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
          onClick={() => setPaymentMethod('creditcard')}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors ${
            paymentMethod === 'creditcard' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
          }`}
        >
          <CreditCard className="w-5 h-5 text-slate-600" />
          <span className="text-xs font-medium text-slate-600">بطاقة</span>
        </button>
        <button
          onClick={() => setPaymentMethod('applepay')}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors ${
            paymentMethod === 'applepay' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
          }`}
        >
          <Apple className="w-5 h-5 text-slate-900" />
          <span className="text-xs font-medium text-slate-600">Apple Pay</span>
        </button>
        <button
          onClick={() => setPaymentMethod('samsungpay')}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-colors ${
            paymentMethod === 'samsungpay' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
          }`}
        >
          <Smartphone className="w-5 h-5 text-slate-600" />
          <span className="text-xs font-medium text-slate-600">Samsung Pay</span>
        </button>
      </div>

      {/* Pay button */}
      <button
        onClick={handlePayment}
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
