import type { Metadata } from 'next';
import { Search, Scale, CheckCircle, ArrowLeft, FileText, Briefcase, CalendarDays, Sparkles, Upload, PenTool, Users, Landmark, MousePointerClick, FolderPlus } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';

export const metadata: Metadata = {
  title: 'الباحث - كل عملك القانوني في مكان واحد | بحث الأحكام وإدارة القضايا',
  description:
    'ابحث في آلاف الأحكام القضائية السعودية وأدر قضاياك وجلساتك ومستنداتك في منصة واحدة. مصممة للمحامين الأفراد والمكاتب الصغيرة في السعودية.',
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
    title: 'الباحث - كل عملك القانوني في مكان واحد',
    description: 'ابحث في آلاف الأحكام القضائية السعودية وأدر قضاياك في منصة واحدة — للمحامين الأفراد والمكاتب الصغيرة.',
    url: 'https://albaheth.app',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

const PLATFORM_FEATURES = [
  {
    icon: Search,
    color: 'bg-primary-50 text-primary-600 border-primary-100',
    title: 'بحث بالمعنى',
    description: 'اكتب الموضوع بكلماتك وافهم النتائج — المحرك يفهم السياق القانوني ويجيب لك الأحكام الأقرب، مع فلاتر المحكمة والمدينة والسنة.',
  },
  {
    icon: Briefcase,
    color: 'bg-sky-50 text-sky-600 border-sky-100',
    title: 'إدارة القضايا',
    description: 'ملف واضح لكل قضية: الأطراف، رقم القضية، المحكمة، والجلسات القادمة بمواعيدها الميلادية والهجرية.',
  },
  {
    icon: Sparkles,
    color: 'bg-violet-50 text-violet-600 border-violet-100',
    title: 'مساعد ذكي',
    description: 'اسأل عن قضيتك — المساعد يعرف تفاصيلها ويبحث في قاعدة الأحكام ليستند لإجابته بالسوابق والأرقام.',
  },
  {
    icon: Upload,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    title: 'تحليل المستندات',
    description: 'ارفع صحيفة دعوى أو عقداً (PDF أو Word) واحصل على ملخص ونقاط قانونية ومخاطر في دقائق.',
  },
  {
    icon: PenTool,
    color: 'bg-rose-50 text-rose-600 border-rose-100',
    title: 'صياغة سريعة',
    description: 'ولّد لوائح الدعاوى ومذكرات الدفاع من معلومات قضيتك والأحكام المرتبطة بها، وصدّرها إلى Word جاهزة.',
  },
  {
    icon: Users,
    color: 'bg-teal-50 text-teal-600 border-teal-100',
    title: 'فريقك معك',
    description: 'أنشئ مكتبك وادعُ فريقك — كل قضية مشتركة بينكم، وكل واحد يرى ما يحتاجه فقط.',
  },
];

const STEPS = [
  {
    icon: Search,
    title: 'ابحث',
    description: 'اكتب موضوع القضية بالعربية وابحث بالمعنى في آلاف الأحكام السعودية.',
  },
  {
    icon: MousePointerClick,
    title: 'احفظ',
    description: 'اربط الأحكام ذات الصلة بملف قضيتك بضغطة واحدة من صفحة النتائج.',
  },
  {
    icon: FolderPlus,
    title: 'أنجز',
    description: 'أدر الجلسات والمستندات، ودع المساعد يصيغ لك المذكرات والدراسات.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <Header />

      {/* Hero — bright, modern, dynamic */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-white">
        {/* soft gradient blobs */}
        <div className="absolute top-[-120px] right-[-80px] w-[420px] h-[420px] bg-primary-100/70 rounded-full blur-3xl animate-float" />
        <div className="absolute top-[40px] left-[-100px] w-[380px] h-[380px] bg-gold-100/60 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-[-60px] left-1/3 w-[300px] h-[300px] bg-sky-100/50 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-primary-200 text-primary-800 text-sm font-medium mb-8 shadow-card">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-soft" />
            منصة سعودية للعمل القانوني — أحكام من المصدر الرسمي
          </div>

          <h1 className="animate-fade-up delay-100 text-4xl md:text-6xl font-bold text-ink-900 mb-6 leading-[1.25] tracking-tight">
            كل عملك القانوني
            <br />
            <span className="bg-gradient-to-l from-primary-600 via-primary-500 to-teal-500 bg-clip-text text-transparent">
              في مكان واحد
            </span>
          </h1>

          <p className="animate-fade-up delay-200 text-lg md:text-xl text-ink-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            ابحث في آلاف الأحكام القضائية السعودية، وأدر قضاياك وجلساتك ومستنداتك —
            منصة واحدة بسيطة صُممت للمحامين الأفراد والمكاتب الصغيرة.
          </p>

          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/search"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white rounded-2xl font-semibold text-lg hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-600/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              ابدأ مجاناً الآن
              <ArrowLeft className="w-4 h-4" />
            </a>
            <a
              href="#platform"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-ink-200 text-ink-800 rounded-2xl font-semibold text-lg hover:border-ink-300 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-card"
            >
              استكشف المنصة
            </a>
          </div>

          <p className="animate-fade-up delay-400 text-sm text-ink-400 mt-8 flex items-center justify-center gap-1.5">
            <Landmark className="w-4 h-4" />
            التسجيل برقم الجوال · بدون بطاقة ائتمانية · باقات تبدأ من 12 ريال شهرياً
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-ink-100 bg-white">
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
              <div className="text-3xl font-bold text-ink-900">6</div>
              <div className="text-sm text-ink-400 mt-1">أدوات في منصة واحدة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform — colorful, friendly */}
      <section id="platform" className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-4">
            <Scale className="w-4 h-4" />
            كل ما تحتاجه
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-4">ست أدوات تغنيك عن عشر برامج</h2>
          <p className="text-ink-500 max-w-2xl mx-auto leading-relaxed">
            من أول بحث في السوابق حتى تسليم المذكرة — كل خطوة في مكان واحد، بدون تعقيد وبدون تنقل بين التطبيقات.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLATFORM_FEATURES.map((f) => (
            <div key={f.title} className="group bg-white rounded-2xl p-7 border border-ink-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-primary-200 transition-all duration-300">
              <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-5 border transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-ink-900 mb-2">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — simple 3 steps */}
      <section className="bg-gradient-to-b from-white to-primary-50/40 border-y border-ink-100">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-4">ثلاث خطوات فقط</h2>
            <p className="text-ink-500 max-w-xl mx-auto">منصة مباشرة وسهلة — تعمل فوراً بدون تدريب أو إعداد</p>
          </div>

          <div className="relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-10 right-[16%] left-[16%] h-0.5 bg-gradient-to-l from-primary-200 via-primary-300 to-primary-200" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
              {STEPS.map((step, i) => (
                <div key={step.title} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border border-primary-100 shadow-card mb-5">
                    <step.icon className="w-8 h-8 text-primary-600" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-ink-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed max-w-[240px] mx-auto">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For individuals and small firms — light, friendly */}
      <section id="firms" className="max-w-6xl mx-auto px-4 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-50 text-gold-700 text-sm font-semibold mb-5 border border-gold-200">
              <Users className="w-4 h-4" />
              للمحامين الأفراد والمكاتب الصغيرة
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink-900 mb-6 leading-snug">
              من مكتبك الفردي
              <br />
              إلى فريقك الصغير
            </h2>
            <p className="text-ink-500 leading-relaxed mb-8">
              ابدأ بحسابك الخاص، وعندما يكبر عملك أنشئ مكتبك وادعُ فريقك برقم الجوال —
              تنتقل قضاياك معك تلقائياً ويصبح كل شيء مشتركاً بينكم.
            </p>
            <ul className="space-y-3.5 mb-10">
              {[
                'قضايا مشتركة بين أعضاء المكتب مع صلاحيات واضحة',
                'دعوة المحامين برقم الجوال — ينضمون تلقائياً عند تسجيلهم',
                'ملف واحد للقضية: الأطراف، الجلسات، المستندات، والأحكام',
                'مواعيد الجلسات بالهجري والميلادي مع تنبيه قرب الموعد',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-primary-600" />
                  </span>
                  <span className="text-ink-600 text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
            <a
              href="/firm"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-ink-900 text-white rounded-2xl font-semibold hover:bg-ink-800 hover:-translate-y-0.5 transition-all"
            >
              أنشئ مكتبك الآن
              <ArrowLeft className="w-4 h-4" />
            </a>
          </div>

          {/* Case card mockup — floating */}
          <div className="relative animate-float-slow">
            <div className="absolute -inset-4 bg-gradient-to-l from-primary-100/50 to-gold-100/50 rounded-3xl blur-xl" />
            <div className="relative bg-white rounded-2xl border border-ink-100 shadow-card-hover overflow-hidden">
              <div className="bg-gradient-to-l from-primary-700 to-primary-600 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">قضية 1446/812</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-white/15 text-white font-medium">نشطة</span>
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
                <div className="border-t border-ink-100 pt-4 flex items-center gap-2 bg-primary-50/50 -mx-5 -mb-5 px-5 py-3.5 rounded-b-2xl">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <p className="text-sm text-ink-600">المساعد الذكي: جهزت ملخص الأحكام المشابهة لقضيتك</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust points */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Scale,
              title: 'مصدر رسمي',
              description: 'جميع الأحكام من المصدر الرسمي لوزارة العدل — محاكم الدرجة الأولى والاستئناف.',
            },
            {
              icon: FileText,
              title: 'بياناتك ملكك',
              description: 'قضاياك ومستنداتك محفوظة بخصوصية تامة، ولا يطّلع عليها إلا أعضاء مكتبك.',
            },
            {
              icon: CalendarDays,
              title: 'من ثوانٍ بدل ساعات',
              description: 'ابحث بالمعنى وابدأ من حيث انتهى الآخرون — بدلاً من البحث اليدوي في مئات الصفحات.',
            },
          ].map((item) => (
            <div key={item.title} className="text-center px-6">
              <div className="w-12 h-12 mx-auto bg-white text-primary-600 rounded-2xl flex items-center justify-center mb-4 border border-ink-100 shadow-card">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-ink-900 mb-2">{item.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-gradient-to-b from-primary-50/40 to-white border-y border-ink-100">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-ink-900 mb-3">أسعار بسيطة وواضحة</h2>
          <p className="text-ink-500 mb-8">ابدأ مجاناً وارتقِ عندما تحتاج — إلغاء في أي وقت.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-ink-200 px-8 py-5 shadow-card">
              <div className="text-2xl font-bold text-ink-900">12 <span className="text-base font-normal text-ink-400">ريال / شهر</span></div>
              <p className="text-xs text-ink-400 mt-1">للمحامي الفرد</p>
            </div>
            <div className="bg-gradient-to-l from-primary-700 to-primary-600 rounded-2xl px-8 py-5 shadow-lg shadow-primary-600/20">
              <div className="text-2xl font-bold text-white">100 <span className="text-base font-normal text-primary-200">ريال / سنة</span></div>
              <p className="text-xs text-primary-200 mt-1">وفر 30% سنوياً</p>
            </div>
          </div>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-ink-900 text-white rounded-2xl font-semibold hover:bg-ink-800 hover:-translate-y-0.5 transition-all"
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
