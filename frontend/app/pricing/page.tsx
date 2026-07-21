import { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckCircle, Sparkles, Crown, Users } from 'lucide-react';
import PaymentButtons from './PaymentButtons';

export const metadata: Metadata = {
  title: 'الأسعار والباقات | الباحث - محرك بحث الأحكام القضائية السعودية',
  description:
    'باقات الباحث لبحث الأحكام القضائية السعودية. تجربة مجانية، باقة شهرية وباقة سنوية. خصم 50% لأول 10 مشتركين. ابحث في آلاف الأحكام السعودية بسهولة.',
  alternates: {
    canonical: 'https://albaheth.app/pricing',
  },
  robots: 'index, follow',
  openGraph: {
    title: 'الأسعار والباقات | الباحث',
    description: 'بقات الباحث لبحث الأحكام القضائية السعودية. خصم 50% لأول 10 مشتركين.',
    url: 'https://albaheth.app/pricing',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo-square.png" alt="الباحث" className="w-10 h-10 rounded-xl" />
          </a>
          <div className="flex items-center gap-4">
            <a href="/search" className="text-sm font-medium text-slate-600 hover:text-primary-600">البحث</a>
            <a href="/about" className="text-sm font-medium text-slate-600 hover:text-primary-600">عن الباحث</a>
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              تسجيل الدخول
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Discount Banner */}
        <div className="bg-primary-600 rounded-2xl p-6 mb-10 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">عرض الإطلاق — خصم 50%</h2>
          </div>
          <p className="text-white text-lg mb-1">احصل على خصم 50% على الباقة السنوية</p>
          <p className="text-primary-50 text-sm">لأول 10 مشتركين فقط — سجل الآن قبل نفاد الأماكن</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <Users className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">0 / 10 مشتركين حتى الآن</span>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">باقات الباحث</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            اختر الباقة المناسبة لك. ابحث في آلاف الأحكام القضائية السعودية بسهولة وذكاء.
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">تجربة مجانية</h3>
              <p className="text-sm text-slate-600">ابدأ بدون تسجيل</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">0</span>
                <span className="text-slate-600 text-sm mr-1">ريال</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                3 عمليات بحث مجانية
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                بحث دلالي ذكي
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                فلترة حسب المحكمة والمدينة
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <span className="w-4 h-4 shrink-0"></span>
                بدون دراسة قانونية تحليلية
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <span className="w-4 h-4 shrink-0"></span>
                بدون بحث غير محدود
              </li>
            </ul>
            <a
              href="/search"
              className="w-full py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-bold text-center hover:bg-primary-50 transition-colors"
            >
              ابدأ مجاناً
            </a>
          </div>

          {/* Monthly Plan */}
          <div className="bg-white rounded-2xl border-2 border-primary-300 p-6 flex flex-col relative shadow-md">
            <div className="absolute -top-3 right-1/2 translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              الأكثر شيوعاً
            </div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">باقة شهرية</h3>
              <p className="text-sm text-slate-600">بحث غير محدود</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-slate-900">149</span>
                <span className="text-slate-600 text-sm mr-1">ريال / شهر</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                بحث غير محدود
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                دراسة قانونية تحليلية لكل بحث
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                فلترة متقدمة (محكمة، مدينة، سنة)
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                عرض نص الحكم كاملاً
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                أحكام ذات صلة لكل قضية
              </li>
            </ul>
            <Suspense fallback={<div className="w-full py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-bold text-center">اشترك الآن - 149 ريال/شهر</div>}>
            <PaymentButtons
              plan="monthly"
              amount={14900}
              label="اشترك الآن - 149 ريال/شهر"
              variant="outline"
            />
            </Suspense>
          </div>

          {/* Annual Plan with 50% discount */}
          <div className="bg-primary-50 rounded-2xl border-2 border-primary-600 p-6 flex flex-col relative shadow-sm">
            <div className="absolute -top-3 right-1/2 translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              خصم 50% لأول 10
            </div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">باقة سنوية</h3>
              <p className="text-sm text-slate-600">أفضل قيمة — وفّر 50%</p>
              <div className="mt-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg text-slate-600 line-through">1,490</span>
                  <span className="text-4xl font-bold text-primary-600">745</span>
                  <span className="text-slate-600 text-sm">ريال / سنة</span>
                </div>
                <p className="text-xs text-primary-600 font-medium mt-1">توفير 745 ريال سنوياً</p>
              </div>
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                جميع مزايا الباقة الشهرية
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                بحث غير محدود طوال السنة
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                دراسة قانونية تحليلية شاملة
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                أولوية في الميزات الجديدة
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-primary-500 shrink-0" />
                دعم فني مخصص
              </li>
            </ul>
            <Suspense fallback={<div className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold text-center">اشترك بخصم 50%</div>}>
            <PaymentButtons
              plan="annual"
              amount={74500}
              label="اشترك بخصم 50%"
              variant="primary"
            />
            </Suspense>
          </div>
        </div>

        {/* Why AlBaheth Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">لماذا الباحث؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">بحث دلالي ذكي</h3>
                <p className="text-sm text-slate-600">ابحث بالمعنى لا بالكلمة المفتاحية فقط. المحرك يفهم السياق القانوني ويجد الأحكام ذات الصلة.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">دراسة قانونية تحليلية</h3>
                <p className="text-sm text-slate-600">احصل على دراسة قانونية شاملة لكل بحث، تستخلص المبادئ القانونية وتحلل الأحكام المرتبطة.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">أحكام موثوقة</h3>
                <p className="text-sm text-slate-600">جميع الأحكام من المصدر الرسمي لوزارة العدل السعودية. محاكم الدرجة الأولى والاستئناف.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">للمحامين والباحثين</h3>
                <p className="text-sm text-slate-600">منصة مصممة خصيصاً للمحامين والمستشارين والباحثين القانونيين في المملكة العربية السعودية.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/search"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-colors"
          >
            ابدأ البحث الآن
          </a>
          <p className="text-sm text-slate-600 mt-3">تجربة مجانية بدون تسجيل — 3 عمليات بحث</p>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-600">
          <div className="flex items-center justify-center gap-4 mb-2">
            <a href="/about" className="hover:text-slate-600">عن الباحث</a>
            <a href="/pricing" className="hover:text-slate-600">الأسعار</a>
            <a href="/faq" className="hover:text-slate-600">الأسئلة الشائعة</a>
            <a href="/terms" className="hover:text-slate-600">الشروط</a>
            <a href="/privacy" className="hover:text-slate-600">الخصوصية</a>
          </div>
          الباحث — محرك بحث ذكي في الأحكام القضائية السعودية
        </div>
      </footer>
    </div>
  );
}
