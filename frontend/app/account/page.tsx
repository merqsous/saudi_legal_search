'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Phone, CreditCard, CheckCircle, XCircle, Loader2, Edit2, Save, Crown, Calendar, Clock } from 'lucide-react';
import Header from '../components/Header';

interface UserData {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
}

interface SubscriptionData {
  subscribed: boolean;
  plan: string | null;
  started_at: string | null;
  expires_at: string | null;
}

interface MoyasarPayment {
  id: string;
  status: string;
  amount: number;
  amount_format: string;
  currency: string;
  description: string;
  created_at: string;
  source: {
    type: string;
    company: string;
    number: string;
    message: string | null;
  };
  metadata: { [key: string]: string };
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [payments, setPayments] = useState<MoyasarPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (!token || !savedUser) {
      router.push('/?signup=1');
      return;
    }
    setUser(JSON.parse(savedUser));
    loadData(token);
  }, [router]);

  const loadData = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [subRes, payRes] = await Promise.all([
        fetch('/api/subscriptions/status', { headers }).then((r) => r.json()),
        fetch('/api/payments', { headers }).then((r) => r.json()),
      ]);

      setSubscription(subRes);
      setPayments(payRes.payments || []);
    } catch (e) {
      console.error('Failed to load account data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'فشل التحديث');
      setUser(data.user);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setEditing(false);
      setProfileMsg('تم تحديث الملف بنجاح');
    } catch (e) {
      setProfileMsg(e instanceof Error ? e.message : 'فشل التحديث');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    router.push('/');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatAmount = (halalas: number) => {
    return (halalas / 100).toFixed(2) + ' ريال';
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('966')) return '0' + phone.slice(3);
    return phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.phone === '966514789632';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              الملف الشخصي
            </h2>
            {!editing ? (
              <button
                onClick={() => {
                  setFirstName(user.first_name || '');
                  setLastName(user.last_name || '');
                  setEditing(true);
                  setProfileMsg(null);
                }}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Edit2 className="w-4 h-4" />
                تعديل
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ
                </button>
                <button
                  onClick={() => { setEditing(false); setProfileMsg(null); }}
                  className="text-sm text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          {profileMsg && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 rounded-lg p-3">{profileMsg}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500 mb-1 block">الاسم الأول</label>
              {editing ? (
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-slate-900">{user.first_name || '-'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">الاسم الأخير</label>
              {editing ? (
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="px-4 py-2.5 bg-slate-50 rounded-xl text-slate-900">{user.last_name || '-'}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-500 mb-1 block">رقم الهاتف</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900" dir="ltr">{formatPhone(user.phone)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Crown className="w-5 h-5 text-primary-600" />
            الاشتراك
          </h2>

          {subscription?.subscribed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-green-900">
                    مشترك — {subscription.plan === 'annual' ? 'باقة سنوية' : 'باقة شهرية'}
                  </p>
                  <p className="text-sm text-green-700 flex items-center gap-1 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    ينتهي في: {formatDate(subscription.expires_at || '')}
                  </p>
                </div>
              </div>
              <a
                href="/pricing"
                className="block w-full py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-bold text-center hover:bg-primary-50 transition-colors"
              >
                تجديد أو تغيير الباقة
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-4">
                <XCircle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-900">غير مشترك</p>
                  <p className="text-sm text-amber-700">اشترك الآن للحصول على 50 بحث يومياً ودراسات قانونية تحليلية</p>
                </div>
              </div>
              <a
                href="/pricing"
                className="block w-full py-3 bg-primary-600 text-white rounded-xl font-bold text-center hover:bg-primary-700 transition-colors"
              >
                اشترك الآن
              </a>
            </div>
          )}
        </div>

        {/* Payment History Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-primary-600" />
            سجل المدفوعات
          </h2>

          {payments.length === 0 ? (
            <p className="text-center text-slate-500 py-8">لا توجد مدفوعات بعد</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const plan = payment.metadata?.plan || 'monthly';
                const statusLabel: Record<string, string> = {
                  paid: 'مدفوع',
                  initiated: 'قيد المعالجة',
                  failed: 'فشل',
                  refunded: 'مسترد',
                  authorized: 'مصرح',
                  captured: 'مكتمل',
                  voided: 'ملغي',
                  verified: 'موثق',
                };
                const statusColor: Record<string, string> = {
                  paid: 'text-green-600',
                  initiated: 'text-amber-600',
                  failed: 'text-red-500',
                  refunded: 'text-slate-400',
                  authorized: 'text-blue-600',
                  captured: 'text-green-600',
                  voided: 'text-slate-400',
                  verified: 'text-green-600',
                };
                const iconColor: Record<string, string> = {
                  paid: 'text-green-600',
                  initiated: 'text-amber-600',
                  failed: 'text-red-500',
                  refunded: 'text-slate-400',
                  authorized: 'text-blue-600',
                  captured: 'text-green-600',
                  voided: 'text-slate-400',
                  verified: 'text-green-600',
                };
                return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    {payment.status === 'paid' || payment.status === 'captured' || payment.status === 'verified' ? (
                      <CheckCircle className={`w-5 h-5 ${iconColor[payment.status] || 'text-slate-400'}`} />
                    ) : (
                      <XCircle className={`w-5 h-5 ${iconColor[payment.status] || 'text-slate-400'}`} />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">
                        {plan === 'annual' ? 'باقة سنوية' : 'باقة شهرية'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(payment.created_at)}
                      </p>
                      {payment.source?.number && (
                        <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{payment.source.number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{payment.amount_format || formatAmount(payment.amount)}</p>
                    <p className={`text-xs mt-0.5 ${statusColor[payment.status] || 'text-slate-400'}`}>
                      {statusLabel[payment.status] || payment.status}
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <a
            href="/favorites"
            className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:border-primary-300 transition-colors"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900">المفضلة</p>
              <p className="text-xs text-slate-500">الأحكام المحفوظة</p>
            </div>
          </a>
          <a
            href="/studies"
            className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:border-primary-300 transition-colors"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-900">الدراسات</p>
              <p className="text-xs text-slate-500">الدراسات القانونية</p>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
