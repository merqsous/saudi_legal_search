import { Search, CheckCircle, Scale, Sparkles } from 'lucide-react';
import Header from './components/Header';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            الباحث — محرك بحث الأحكام القضائية السعودية
          </h1>
          <p className="text-lg text-slate-600 mb-4 max-w-2xl mx-auto leading-relaxed">
            ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف. منصة قانونية متخصصة للمحامين والمستشارين والباحثين في القانون السعودي.
          </p>
          <p className="text-base text-slate-500 mb-8 max-w-2xl mx-auto">
            سجل دخولك مجاناً وابحث بالمعنى لا بالكلمة المفتاحية فقط. باقات تبدأ من 29.99 ريال شهرياً.
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

        {/* Pricing Banner */}
        <div className="bg-primary-600 rounded-2xl p-6 mb-12 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">باقات بأسعار تنافسية</h2>
          </div>
          <p className="text-white text-lg mb-4">شهري 29.99 ريال — سنوي 300 ريال — 50 بحث يومياً</p>
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
            <h3 className="font-bold text-slate-900 mb-2">تسجيل مجاني</h3>
            <p className="text-sm text-slate-600">سجل دخولك وابحث في الأحكام فوراً</p>
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

    </div>
  );
}
