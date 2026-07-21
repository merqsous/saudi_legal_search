import { Search, CheckCircle, Scale, Sparkles, Crown } from 'lucide-react';
import LandingAuth from './components/LandingAuth';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-square.png" alt="الباحث" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold text-slate-900">الباحث</span>
          </div>
          <LandingAuth />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            الباحث — محرك بحث الأحكام القضائية السعودية
          </h1>
          <p className="text-lg text-slate-600 mb-4 max-w-2xl mx-auto leading-relaxed">
            ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف. منصة قانونية متخصصة للمحامين والمستشارين والباحثين في القانون السعودي.
          </p>
          <p className="text-base text-slate-500 mb-8 max-w-2xl mx-auto">
            تجربة مجانية تتيح لك 3 عمليات بحث بدون تسجيل. ابحث بالمعنى لا بالكلمة المفتاحية فقط.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/search"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              ابحث الآن
            </a>
            <a
              href="/search"
              className="w-full sm:w-auto px-8 py-4 border-2 border-primary-600 text-primary-600 rounded-xl font-bold text-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
            >
              تصفح الأحكام
            </a>
          </div>
        </div>

        {/* Launch Offer Banner */}
        <div className="bg-primary-600 rounded-2xl p-6 mb-12 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">عرض الإطلاق — خصم 50% لأول 10 مشتركين</h2>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <p className="text-white text-lg mb-4">باقة سنوية بـ 745 ريال فقط بدلاً من 1,490 ريال</p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 rounded-xl font-bold hover:bg-primary-50 transition-colors"
          >
            عرض الباقات والأسعار
          </a>
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
          <div className="flex items-center justify-center gap-4 mb-2">
            <a href="/about" className="text-slate-600 hover:text-primary-600">عن الباحث</a>
            <a href="/pricing" className="text-slate-600 hover:text-primary-600">الأسعار</a>
            <a href="/faq" className="text-slate-600 hover:text-primary-600">الأسئلة الشائعة</a>
            <a href="/terms" className="text-slate-600 hover:text-primary-600">الشروط</a>
            <a href="/privacy" className="text-slate-600 hover:text-primary-600">الخصوصية</a>
          </div>
          الباحث — محرك بحث ذكي في الأحكام القضائية السعودية | محاكم الدرجة الأولى والاستئناف
          <div className="mt-2">
            <a href="mailto:albahethapp@gmail.com" className="text-primary-600 hover:text-primary-700">albahethapp@gmail.com</a>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'الباحث',
              alternateName: 'AlBaheth',
              url: 'https://albaheth.app',
              description: 'محرك بحث ذكي في الأحكام القضائية السعودية',
              inLanguage: 'ar-SA',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://albaheth.app/search?q={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'الباحث',
              url: 'https://albaheth.app',
              email: 'albahethapp@gmail.com',
              description: 'منصة قانونية متخصصة للبحث في الأحكام القضائية السعودية',
              areaServed: 'SA',
            },
          ]),
        }}
      />
    </div>
  );
}
