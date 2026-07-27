import type { Metadata } from 'next';
import { Search, CheckCircle, Scale, Sparkles } from 'lucide-react';
import Header from './components/Header';

export const metadata: Metadata = {
  title: 'الباحث - بحث الأحكام القضائية السعودية | محرك بحث قانوني',
  description:
    'ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف. محرك بحث قانوني متخصص للمحامين والباحثين في القانون السعودي. بحث دلالي ذكي في الأحكام والصكوك القضائية.',
  keywords: [
    'الأحكام القضائية السعودية',
    'بحث الأحكام القضائية',
    'محرك بحث قانوني',
    'أحكام المحاكم السعودية',
    'البحث في الأحكام',
    'صكوك قضائية',
    'الأحكام الشرعية',
    'محكمة الاستئناف',
    'محاكم الدرجة الأولى',
    'القانون السعودي',
    'الأحكام القضائية',
    'الباحث القانوني',
  ],
  alternates: {
    canonical: 'https://albaheth.app',
  },
  openGraph: {
    title: 'الباحث - بحث الأحكام القضائية السعودية',
    description: 'محرك بحث قانوني متخصص في الأحكام القضائية السعودية. ابحث بالمعنى في آلاف الأحكام.',
    url: 'https://albaheth.app',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

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

        {/* SEO Content Section */}
        <section className="max-w-3xl mx-auto px-4 py-12 text-slate-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">بحث الأحكام القضائية في المملكة العربية السعودية</h2>
          <p className="mb-4">
            منصة <strong>الباحث</strong> هي محرك بحث قانوني متخصص في الأحكام القضائية السعودية، يتيح للمحامين والمستشارين القانونيين والباحثين البحث في آلاف الأحكام الصادرة من محاكم المملكة العربية السعودية. يشمل البحث أحكام محاكم الدرجة الأولى ومحاكم الاستئناف في مختلف المدن والمناطق. <a href="/search" className="text-primary-600 hover:text-primary-700 font-medium">ابدأ البحث الآن</a>.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">أنواع المحاكم المتوفرة في البحث</h3>
          <ul className="list-disc pr-6 space-y-2 mb-6">
            <li><strong>المحاكم العامة</strong> — أحكام الدعاوى الكبرى والقضايا الحقوقية والعقارية</li>
            <li><strong>المحاكم الجزائية</strong> — الأحكام في القضايا الجنائية والجزائية</li>
            <li><strong>محاكم الأحوال الشخصية</strong> — أحكام الزواج والطلاق والحضانة والنفقة والميراث</li>
            <li><strong>المحاكم العمالية</strong> — أحكام منازعات عقود العمل والأجور وإصابات العمل</li>
            <li><strong>المحاكم التجارية</strong> — أحكام المنازعات التجارية والإفلاس والشركات</li>
            <li><strong>محاكم الاستئناف</strong> — أحكام الاستئناف على قرارات محاكم الدرجة الأولى</li>
          </ul>
          <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">ميزات البحث في الباحث</h3>
          <p className="mb-4">
            يتميز محرك بحث الباحث بالبحث الدلالي الذكي الذي يفهم معنى الاستعلام بدلاً من المطابقة الحرفية للكلمات، مما يسهل العثور على الأحكام ذات الصلة. يمكن الفلترة حسب نوع المحكمة والمدينة وسنة الحكم ومستوى المحكمة. كما تتضمن كل نتيجة بيانات الحكم الكاملة بما في ذلك رقم الحكم وتاريخه ونوع المحكمة ومدونة القضية. لمعرفة المزيد، راجع <a href="/faq" className="text-primary-600 hover:text-primary-700 font-medium">الأسئلة الشائعة</a>.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">كيفية البحث في الأحكام القضائية</h3>
          <p className="mb-4">
            سجل دخولك مجاناً باستخدام رقم جوالك، ثم اكتب استعلامك بالعربية. يمكنك البحث عن موضوع القضية أو نوع الحكم أو رقم القضية. تدعم المنصة البحث في أحكام محاكم الرياض وجدة ومكة المكرمة والمدينة المنورة والدمام وأبها وتبوك وغيرها من مدن المملكة. اطّلع على <a href="/pricing" className="text-primary-600 hover:text-primary-700 font-medium">باقات الاشتراك</a> المتاحة.
          </p>
          <h3 className="text-xl font-bold text-slate-900 mb-3 mt-6">لماذا الباحث؟</h3>
          <p className="mb-4">
            يوفر الباحث للمحامين والمستشارين القانونيين أداة قوية للبحث في الأحكام القضائية السعودية بسرعة وذكاء. بدلاً من قضاء ساعات في البحث اليدوي، يمكنك العثور على الأحكام ذات الصلة في ثوانٍ. جميع الأحكام مصدرها وزارة العدل السعودية ومحدثة باستمرار. <a href="/about" className="text-primary-600 hover:text-primary-700 font-medium">اقرأ المزيد عن الباحث</a>.
          </p>
        </section>
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
          <div className="mt-2 flex items-center justify-center gap-4">
            <a href="mailto:albahethapp@gmail.com" className="text-primary-600 hover:text-primary-700">albahethapp@gmail.com</a>
            <a href="https://x.com/albahethapp" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span>@albahethapp</span>
            </a>
            <a href="https://wa.me/966533226864" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>واتساب</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
