import type { Metadata } from 'next';
import { Search, Scale, CheckCircle, Sparkles, ArrowLeft, FileText, Filter, Zap } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';

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
    <div className="min-h-screen bg-white" dir="rtl">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-50/40 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            بحث دلالي ذكي في الأحكام القضائية
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-[1.2] tracking-tight">
            محرك بحث الأحكام
            <br />
            <span className="text-primary-600">القضائية السعودية</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-4 max-w-2xl mx-auto leading-relaxed">
            ابحث في آلاف الأحكام الصادرة من محاكم المملكة العربية السعودية. منصة متخصصة للمحامين والمستشارين والباحثين القانونيين.
          </p>
          <p className="text-base text-slate-500 mb-10 max-w-xl mx-auto">
            سجل دخولك مجاناً وابحث بالمعنى لا بالكلمة المفتاحية فقط. باقات تبدأ من 29.99 ريال شهرياً.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/search"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-all hover:shadow-lg hover:shadow-primary-600/20 flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              ابحث الآن
              <ArrowLeft className="w-4 h-4" />
            </a>
            <a
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 border border-slate-300 text-slate-700 rounded-xl font-bold text-lg hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              عرض الباقات
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-slate-900">+10,000</div>
              <div className="text-sm text-slate-500 mt-1">حكم قضائي</div>
            </div>
            <div className="border-x border-slate-100">
              <div className="text-3xl font-bold text-slate-900">+15</div>
              <div className="text-sm text-slate-500 mt-1">نوع محكمة</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900">+13</div>
              <div className="text-sm text-slate-500 mt-1">مدينة في المملكة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">لماذا الباحث؟</h2>
          <p className="text-slate-600 max-w-xl mx-auto">منصة قانونية متكاملة صُممت خصيصاً للمتخصصين في القانون السعودي</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-white rounded-2xl p-8 border border-slate-200 hover:border-primary-200 hover:shadow-lg transition-all">
            <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">بحث دلالي ذكي</h3>
            <p className="text-sm text-slate-600 leading-relaxed">ابحث بالمعنى لا بالكلمة المفتاحية فقط. المحرك يفهم السياق القانوني ويجد الأحكام ذات الصلة.</p>
          </div>
          <div className="group bg-white rounded-2xl p-8 border border-slate-200 hover:border-primary-200 hover:shadow-lg transition-all">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Scale className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">أحكام موثوقة</h3>
            <p className="text-sm text-slate-600 leading-relaxed">جميع الأحكام من المصدر الرسمي لوزارة العدل السعودية. محاكم الدرجة الأولى والاستئناف.</p>
          </div>
          <div className="group bg-white rounded-2xl p-8 border border-slate-200 hover:border-primary-200 hover:shadow-lg transition-all">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">دراسة قانونية تحليلية</h3>
            <p className="text-sm text-slate-600 leading-relaxed">دراسة شاملة لكل بحث تستخلص المبادئ القانونية وتحلل الأحكام المرتبطة بقضيتك.</p>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">باقات بأسعار تنافسية</h2>
          <p className="text-slate-600 mb-8">ابدأ البحث في الأحكام القضائية السعودية الآن — 50 بحث يومياً</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-sm">
              <div className="text-2xl font-bold text-slate-900">29.99 <span className="text-base font-normal text-slate-500">ريال / شهر</span></div>
            </div>
            <div className="bg-primary-600 rounded-xl px-6 py-4 shadow-md">
              <div className="text-2xl font-bold text-white">300 <span className="text-base font-normal text-primary-100">ريال / سنة</span></div>
            </div>
          </div>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all hover:shadow-lg hover:shadow-primary-600/20"
          >
            عرض جميع الباقات
            <ArrowLeft className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-slate-700 leading-relaxed">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">بحث الأحكام القضائية في المملكة العربية السعودية</h2>
        <p className="mb-4">
          منصة <strong>الباحث</strong> هي محرك بحث قانوني متخصص في الأحكام القضائية السعودية، يتيح للمحامين والمستشارين القانونيين والباحثين البحث في آلاف الأحكام الصادرة من محاكم المملكة العربية السعودية. يشمل البحث أحكام محاكم الدرجة الأولى ومحاكم الاستئناف في مختلف المدن والمناطق. <a href="/search" className="text-primary-600 hover:text-primary-700 font-medium">ابدأ البحث الآن</a>.
        </p>
        <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">أنواع المحاكم المتوفرة في البحث</h3>
        <ul className="list-disc pr-6 space-y-2 mb-6">
          <li><strong>المحاكم العامة</strong> — أحكام الدعاوى الكبرى والقضايا الحقوقية والعقارية</li>
          <li><strong>المحاكم الجزائية</strong> — الأحكام في القضايا الجنائية والجزائية</li>
          <li><strong>محاكم الأحوال الشخصية</strong> — أحكام الزواج والطلاق والحضانة والنفقة والميراث</li>
          <li><strong>المحاكم العمالية</strong> — أحكام منازعات عقود العمل والأجور وإصابات العمل</li>
          <li><strong>المحاكم التجارية</strong> — أحكام المنازعات التجارية والإفلاس والشركات</li>
          <li><strong>محاكم الاستئناف</strong> — أحكام الاستئناف على قرارات محاكم الدرجة الأولى</li>
        </ul>
        <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">ميزات البحث في الباحث</h3>
        <p className="mb-4">
          يتميز محرك بحث الباحث بالبحث الدلالي الذكي الذي يفهم معنى الاستعلام بدلاً من المطابقة الحرفية للكلمات، مما يسهل العثور على الأحكام ذات الصلة. يمكن الفلترة حسب نوع المحكمة والمدينة وسنة الحكم ومستوى المحكمة. كما تتضمن كل نتيجة بيانات الحكم الكاملة بما في ذلك رقم الحكم وتاريخه ونوع المحكمة ومدونة القضية. لمعرفة المزيد، راجع <a href="/faq" className="text-primary-600 hover:text-primary-700 font-medium">الأسئلة الشائعة</a>.
        </p>
        <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">كيفية البحث في الأحكام القضائية</h3>
        <p className="mb-4">
          سجل دخولك مجاناً باستخدام رقم جوالك، ثم اكتب استعلامك بالعربية. يمكنك البحث عن موضوع القضية أو نوع الحكم أو رقم القضية. تدعم المنصة البحث في أحكام محاكم الرياض وجدة ومكة المكرمة والمدينة المنورة والدمام وأبها وتبوك وغيرها من مدن المملكة. اطّلع على <a href="/pricing" className="text-primary-600 hover:text-primary-700 font-medium">باقات الاشتراك</a> المتاحة.
        </p>
        <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">لماذا الباحث؟</h3>
        <p className="mb-4">
          يوفر الباحث للمحامين والمستشارين القانونيين أداة قوية للبحث في الأحكام القضائية السعودية بسرعة وذكاء. بدلاً من قضاء ساعات في البحث اليدوي، يمكنك العثور على الأحكام ذات الصلة في ثوانٍ. جميع الأحكام مصدرها وزارة العدل السعودية ومحدثة باستمرار. <a href="/about" className="text-primary-600 hover:text-primary-700 font-medium">اقرأ المزيد عن الباحث</a>.
        </p>
      </section>

      <Footer />
    </div>
  );
}
