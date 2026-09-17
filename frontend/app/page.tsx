import type { Metadata } from 'next';
import { Search, Scale, CheckCircle, ArrowLeft, FileText, Zap, Briefcase, CalendarDays, Sparkles, Upload, PenTool, Users, ShieldCheck, Landmark, Clock, Building2 } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata: Metadata = {
  title: 'الباحث - منصة العمل القانوني الذكية | أحكام قضائية وإدارة قضايا',
  description:
    'منصة عمل قانونية متكاملة لمكاتب المحاماة والإدارات القانونية في السعودية: بحث دلالي في آلاف الأحكام القضائية، إدارة القضايا والجلسات، مساعد ذكي، تحليل المستندات وصياغة المذكرات.',
  keywords: [
    'الأحكام القضائية السعودية',
    'بحث الأحكام القضائية',
    'محرك بحث قانوني',
    'إدارة قضايا',
    'برنامج مكتب محاماة',
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
    title: 'الباحث - منصة العمل القانوني الذكية',
    description: 'بحث دلالي في آلاف الأحكام القضائية السعودية، إدارة قضايا المكتب، ومساعد ذكي — في منصة واحدة.',
    url: 'https://albaheth.app',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

const PLATFORM_FEATURES = [
  {
    icon: Search,
    title: 'بحث دلالي في الأحكام',
    description: 'ابحث بالمعنى لا بالكلمة المفتاحية فقط. المحرك يفهم السياق القانوني ويرتب النتائج بالصلة، مع فلاتر المحكمة والمدينة والسنة.',
  },
  {
    icon: Briefcase,
    title: 'إدارة قضايا المكتب',
    description: 'ملف متكامل لكل قضية: المدعي والمدعي عليه، جلسات المواعيد بمواعيدها الميلادية والهجرية، والأحكام المرتبطة بالقضية.',
  },
  {
    icon: Sparkles,
    title: 'مساعد ذكي لكل قضية',
    description: 'مساعد قانوني يعرف تفاصيل قضيتك ويجيب على أسئلتك، ويبحث في قاعدة الأحكام السعودية ليدعم إجابته بالسوابق.',
  },
  {
    icon: Upload,
    title: 'تحليل المستندات',
    description: 'ارفع صحائف الدعاوى والعقود بصيغة PDF أو Word، واحصل على ملخص تنفيذي ونقاط قانونية ومخاطر في دقائق.',
  },
  {
    icon: PenTool,
    title: 'صياغة المستندات',
    description: 'ولّد لوائح الدعاوى ومذكرات الدفاع والآراء القانونية من معلومات القضية والأحكام المرتبطة، وصدّرها إلى Word.',
  },
  {
    icon: Users,
    title: 'فرق العمل والمكاتب',
    description: 'أنشئ مكتبك وادعُ فريقك — كل قضية تصبح مشتركة بين الأعضاء مع صلاحيات واضحة للمالك.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <Header />

      {/* Hero — dark, professional */}
      <section className="relative bg-ink-950 overflow-hidden">
        {/* subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(to left, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-primary-600/15 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-medium mb-8">
            <Landmark className="w-4 h-4 text-gold-400" />
            منصة سعودية للعمل القانوني — أحكام من المصدر الرسمي لوزارة العدل
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-[1.25] tracking-tight">
            منصة العمل القانوني
            <br />
            <span className="text-primary-300">لمكاتب المحاماة والشركات</span>
          </h1>

          <p className="text-lg md:text-xl text-ink-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            ابحث في آلاف الأحكام القضائية السعودية، وأدر قضايا مكتبك وجلساته، ودع المساعد الذكي يحلل مستنداتك ويصيغ مذكراتك — في منصة واحدة.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/search"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-xl font-semibold text-lg hover:bg-primary-500 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              ابدأ مجاناً الآن
              <ArrowLeft className="w-4 h-4" />
            </a>
            <a
              href="/#firms"
              className="w-full sm:w-auto px-8 py-4 border border-white/15 text-white rounded-xl font-semibold text-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-5 h-5 text-ink-300" />
              حلول المكاتب والشركات
            </a>
          </div>

          <p className="text-sm text-ink-400 mt-8">
            التسجيل برقم الجوال — باقات تبدأ من 12 ريال شهرياً
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-ink-900">+10,000</div>
              <div className="text-sm text-ink-400 mt-1">حكم قضائي</div>
            </div>
            <div className="border-r border-ink-100">
              <div className="text-3xl font-bold text-ink-900">+15</div>
              <div className="text-sm text-ink-400 mt-1">نوع محكمة</div>
            </div>
            <div className="border-r border-ink-100">
              <div className="text-3xl font-bold text-ink-900">+13</div>
              <div className="text-sm text-ink-400 mt-1">مدينة في المملكة</div>
            </div>
            <div className="border-r border-ink-100 hidden md:block">
              <div className="text-3xl font-bold text-ink-900">50</div>
              <div className="text-sm text-ink-400 mt-1">بحثاً يومياً</div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform capabilities */}
      <section id="platform" className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">المنصة</p>
          <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-4">كل أدوات عملك القانوني في مكان واحد</h2>
          <p className="text-ink-500 max-w-2xl mx-auto leading-relaxed">
            صُممت الباحث للمحامين والمستشارين القانونيين في السعودية — من البحث في السوابق حتى إدارة القضايا وصياغة المستندات.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLATFORM_FEATURES.map((f) => (
            <div key={f.title} className="card card-hover p-7">
              <div className="w-11 h-11 bg-primary-50 text-primary-700 rounded-lg flex items-center justify-center mb-5 border border-primary-100">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink-900 mb-2">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For firms and companies */}
      <section id="firms" className="bg-ink-950 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(to left, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="eyebrow mb-3 text-gold-400">للمكاتب والشركات</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-snug">
                مبنية لطريقة عمل
                <br />
                مكاتب المحاماة والإدارات القانونية
              </h2>
              <p className="text-ink-300 leading-relaxed mb-8">
                من قضايا الموكل الواحد إلى إدارة ملفات مكتب كامل — الباحث تنمو معك، من حساب فردي إلى فريق متكامل يشارك القضايا ويتعاون عليها.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'قضايا مشتركة بين جميع أعضاء المكتب مع صلاحيات واضحة',
                  'دعوة المحامين برقم الجوال — ينضمون تلقائياً عند التسجيل',
                  'ملف موحد للقضية: الأطراف، الجلسات، المستندات، والأحكام',
                  'تتبع جلسات المحكمة بمواعيدها الميلادية والهجرية',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
                    <span className="text-ink-200 text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/firm"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink-900 rounded-xl font-semibold hover:bg-ink-100 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                أنشئ مكتبك الآن
                <ArrowLeft className="w-4 h-4" />
              </a>
            </div>

            {/* Case card mockup */}
            <div className="relative">
              <div className="card p-0 overflow-hidden">
                <div className="bg-ink-900 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-semibold text-white">قضية 1446/812</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary-600/20 text-primary-300 font-medium">نشطة</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-ink-400 mb-1.5">الأطراف</p>
                    <p className="text-sm text-ink-800">
                      <span className="font-semibold">شركة الرياض للتطوير</span>
                      <span className="text-ink-400 mx-1">ضد</span>
                      <span>مؤسسة جدة التجارية</span>
                    </p>
                  </div>
                  <div className="border-t border-ink-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-ink-400">الجلسة القادمة</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">بعد 3 أيام</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-ink-700">
                      <CalendarDays className="w-4 h-4 text-ink-400" />
                      <span>15 رجب 1447هـ — مواصلة نظر الدعوى</span>
                    </div>
                  </div>
                  <div className="border-t border-ink-100 pt-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    <p className="text-sm text-ink-600">المساعد الذكي: جهزت ملخص الأحكام المشابهة لقضيتك</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust points */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: ShieldCheck,
              title: 'بياناتك ملكك',
              description: 'قضاياك ومستنداتك محفوظة بخصوصية تامة، ولا يطّلع عليها إلا أعضاء مكتبك.',
            },
            {
              icon: Landmark,
              title: 'مصدر رسمي',
              description: 'جميع الأحكام من المصدر الرسمي لوزارة العدل السعودية — محاكم الدرجة الأولى والاستئناف.',
            },
            {
              icon: Clock,
              title: 'من ثوانٍ بدل ساعات',
              description: 'ابحث بالمعنى وابدأ من حيث انتهى الآخرون — بدلاً من البحث اليدوي في مئات الصفحات.',
            },
          ].map((item) => (
            <div key={item.title} className="text-center px-6">
              <div className="w-12 h-12 mx-auto bg-ink-50 text-ink-700 rounded-xl flex items-center justify-center mb-4 border border-ink-100">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink-900 mb-2">{item.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-ink-50 border-y border-ink-100">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-ink-900 mb-3">أسعار واضحة، بدون مفاجآت</h2>
          <p className="text-ink-500 mb-8">ابدأ مجاناً — وارتقِ عندما تحتاج المزيد. إلغاء في أي وقت.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="bg-white rounded-xl border border-ink-200 px-8 py-5">
              <div className="text-2xl font-bold text-ink-900">12 <span className="text-base font-normal text-ink-400">ريال / شهر</span></div>
              <p className="text-xs text-ink-400 mt-1">الفردية</p>
            </div>
            <div className="bg-primary-700 rounded-xl px-8 py-5">
              <div className="text-2xl font-bold text-white">100 <span className="text-base font-normal text-primary-200">ريال / سنة</span></div>
              <p className="text-xs text-primary-200 mt-1">وفر 30% سنوياً</p>
            </div>
          </div>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-xl font-semibold hover:bg-ink-800 transition-colors"
          >
            عرض جميع الباقات
            <ArrowLeft className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-ink-600 leading-relaxed">
        <h2 className="text-2xl font-bold text-ink-900 mb-6 text-center">بحث الأحكام القضائية في المملكة العربية السعودية</h2>
        <p className="mb-4">
          منصة <strong>الباحث</strong> هي منصة عمل قانوني متخصصة في الأحكام القضائية السعودية، تتيح للمحامين والمستشارين القانونيين والباحثين البحث في آلاف الأحكام الصادرة من محاكم المملكة العربية السعودية، مع إدارة قضايا المكتب وتحليل المستندات في مكان واحد. يشمل البحث أحكام محاكم الدرجة الأولى ومحاكم الاستئناف في مختلف المدن والمناطق. <a href="/search" className="text-primary-700 hover:text-primary-800 font-medium">ابدأ البحث الآن</a>.
        </p>
        <h3 className="text-xl font-bold text-ink-900 mb-3 mt-8">أنواع المحاكم المتوفرة في البحث</h3>
        <ul className="list-disc pr-6 space-y-2 mb-6">
          <li><strong>المحاكم العامة</strong> — أحكام الدعاوى الكبرى والقضايا الحقوقية والعقارية</li>
          <li><strong>المحاكم الجزائية</strong> — الأحكام في القضايا الجنائية والجزائية</li>
          <li><strong>محاكم الأحوال الشخصية</strong> — أحكام الزواج والطلاق والحضانة والنفقة والميراث</li>
          <li><strong>المحاكم العمالية</strong> — أحكام منازعات عقود العمل والأجور وإصابات العمل</li>
          <li><strong>المحاكم التجارية</strong> — أحكام المنازعات التجارية والإفلاس والشركات</li>
          <li><strong>محاكم الاستئناف</strong> — أحكام الاستئناف على قرارات محاكم الدرجة الأولى</li>
        </ul>
        <h3 className="text-xl font-bold text-ink-900 mb-3 mt-8">ميزات البحث في الباحث</h3>
        <p className="mb-4">
          يتميز محرك بحث الباحث بالبحث الدلالي الذكي الذي يفهم معنى الاستعلام بدلاً من المطابقة الحرفية للكلمات، مما يسهل العثور على الأحكام ذات الصلة. يمكن الفلترة حسب نوع المحكمة والمدينة وسنة الحكم ومستوى المحكمة. كما تتضمن كل نتيجة بيانات الحكم الكاملة بما في ذلك رقم الحكم وتاريخه ونوع المحكمة ومدونة القضية. لمعرفة المزيد، راجع <a href="/faq" className="text-primary-700 hover:text-primary-800 font-medium">الأسئلة الشائعة</a>.
        </p>
        <h3 className="text-xl font-bold text-ink-900 mb-3 mt-8">كيفية البحث في الأحكام القضائية</h3>
        <p className="mb-4">
          سجل دخولك مجاناً باستخدام رقم جوالك، ثم اكتب استعلامك بالعربية. يمكنك البحث عن موضوع القضية أو نوع الحكم أو رقم القضية. تدعم المنصة البحث في أحكام محاكم الرياض وجدة ومكة المكرمة والمدينة المنورة والدمام وأبها وتبوك وغيرها من مدن المملكة. اطّلع على <a href="/pricing" className="text-primary-700 hover:text-primary-800 font-medium">باقات الاشتراك</a> المتاحة.
        </p>
        <h3 className="text-xl font-bold text-ink-900 mb-3 mt-8">لماذا الباحث؟</h3>
        <p className="mb-4">
          يوفر الباحث للمحامين والمستشارين القانونيين منصة متكاملة للبحث في الأحكام القضائية السعودية وإدارة القضايا بسرعة وذكاء. بدلاً من قضاء ساعات في البحث اليدوي، يمكنك العثور على الأحكام ذات الصلة في ثوانٍ. جميع الأحكام مصدرها وزارة العدل السعودية ومحدثة باستمرار. <a href="/about" className="text-primary-700 hover:text-primary-800 font-medium">اقرأ المزيد عن الباحث</a>.
        </p>
      </section>

      <Footer />
    </div>
  );
}
