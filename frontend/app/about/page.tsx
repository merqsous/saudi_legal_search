import { Metadata } from 'next';
import { Scale, Search, CheckCircle, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'عن الباحث | محرك بحث الأحكام القضائية السعودية',
  description: 'الباحث هو محرك بحث ذكي متخصص في الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف. ابحث بالمعنى لا بالكلمة المفتاحية فقط.',
  alternates: {
    canonical: 'https://albaheth.app/about',
  },
  robots: 'index, follow',
  openGraph: {
    title: 'عن الباحث | محرك بحث الأحكام القضائية السعودية',
    description: 'محرك بحث ذكي متخصص في الأحكام القضائية السعودية.',
    url: 'https://albaheth.app/about',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="https://albaheth.app" className="flex items-center gap-3">
            <img src="/logo-square.png" alt="الباحث" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold text-slate-900">الباحث</span>
          </a>
          <a href="/search" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            البحث
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">عن الباحث</h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8">
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            الباحث هو محرك بحث ذكي متخصص في الأحكام القضائية السعودية. يتيح للمحامين والمستشارين والباحثين القانونيين
            البحث في آلاف الأحكام الصادرة من محاكم الدرجة الأولى ومحكمة الاستئناف في المملكة العربية السعودية.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed mb-4">
            يتميز الباحث بالبحث الدلالي — ابحث بالمعنى لا بالكلمة المفتاحية فقط. يجد المحرك الأحكام ذات الصلة
            بموضوع البحث حتى لو لم تطابق الكلمات المفتاحية تماماً.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            يشمل البحث أحكام المحاكم التجارية والمحاكم العامة ومحاكم التنفيذ ومحاكم الاستئناف
            في مختلف مدن المملكة العربية السعودية مثل الرياض وجدة ومكة المكرمة والمدينة المنورة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-slate-900 mb-2">بحث دلالي ذكي</h2>
            <p className="text-sm text-slate-600">ابحث بالمعنى لا بالكلمة المفتاحية فقط. يجد المحرك الأحكام ذات الصلة بموضوع البحث.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Scale className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-slate-900 mb-2">أحكام موثوقة</h2>
            <p className="text-sm text-slate-600">أحكام من محاكم المملكة العربية السعودية — الدرجة الأولى والاستئناف.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-slate-900 mb-2">تجربة مجانية</h2>
            <p className="text-sm text-slate-600">3 عمليات بحث مجانية بدون تسجيل. سجل للحصول على بحث غير محدود.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">أنواع المحاكم</h2>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-600"></span>
              المحاكم التجارية — أحكام القضايا التجارية والشركاتية
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-600"></span>
              المحاكم العامة — أحكام القضايا المدنية والعمالية
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-600"></span>
              محاكم التنفيذ — أحكام تنفيذ الأحكام والسندات
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-600"></span>
              محاكم الاستئناف — أحكام التظلم من أحكام الدرجة الأولى
            </li>
          </ul>
        </div>

        <div className="text-center">
          <a
            href="/search"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-colors"
          >
            <Search className="w-5 h-5" />
            ابدأ البحث الآن
          </a>
        </div>

        <div className="mt-12 text-center text-sm text-slate-500">
          <a href="mailto:albahethapp@gmail.com" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700">
            <Mail className="w-4 h-4" />
            albahethapp@gmail.com
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
          الباحث — محرك بحث ذكي في الأحكام القضائية السعودية
        </div>
      </footer>
    </div>
  );
}
