import type { Metadata } from 'next';
import { Scale, CheckCircle, ArrowLeft, Briefcase, CalendarDays, Sparkles, Landmark } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSearch from './components/HeroSearch';

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
    images: [{ url: '/brand/albaheth-og-1200x630.png', width: 1200, height: 630, alt: 'الباحث — Albaheth' }],
  },
};

const FEATURES = [
  {
    title: 'بحث بالمعنى',
    body: 'اكتب موضوع القضية بكلماتك وافهم النتائج — المحرك يفهم السياق القانوني ويجيب لك الأحكام الأقرب، مع فلاتر المحكمة والمدينة والسنة.',
  },
  {
    title: 'إدارة القضايا',
    body: 'ملف واضح لكل قضية: المدعي والمدعي عليه، رقم القضية والمحكمة، والجلسات القادمة بمواعيدها الميلادية والهجرية.',
  },
  {
    title: 'مساعد ذكي',
    body: 'اسأل عن قضيتك — المساعد يعرف تفاصيلها ويبحث في قاعدة الأحكام ليستند لإجابته بالسوابق وأرقامها.',
  },
  {
    title: 'تحليل المستندات',
    body: 'ارفع صحيفة دعوى أو عقداً (PDF أو Word) واحصل على ملخص تنفيذي ونقاط قانونية ومخاطر في دقائق.',
  },
  {
    title: 'صياغة سريعة',
    body: 'ولّد لوائح الدعاوى ومذكرات الدفاع من معلومات قضيتك والأحكام المرتبطة بها، وصدّرها إلى Word.',
  },
  {
    title: 'فريقك معك',
    body: 'أنشئ مكتبك وادعُ فريقك برقم الجوال — كل قضية مشتركة بينكم بصلاحيات واضحة.',
  },
];

const STEPS = [
  { n: '01', title: 'ابحث', body: 'اكتب موضوع القضية بالعربية وابحث بالمعنى في آلاف الأحكام السعودية.' },
  { n: '02', title: 'احفظ', body: 'اربط الأحكام ذات الصلة بملف قضيتك بضغطة واحدة من صفحة النتائج.' },
  { n: '03', title: 'أنجز', body: 'أدر الجلسات والمستندات، ودع المساعد يصيغ لك المذكرات والدراسات.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink-900" dir="rtl">
      <Header />

      {/* Hero — the ChatGPT pattern: land in the product, zero marketing */}
      <section className="relative bg-primary-950 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 40% at 50% 0%, rgba(47,125,79,0.30), transparent 70%)',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 pt-28 pb-32 md:pt-36 md:pb-40 flex flex-col items-center">
          <p className="text-white text-2xl md:text-3xl font-medium mb-8">
            ما موضوع بحثك؟
          </p>

          <HeroSearch />

          <p className="text-ink-400 text-xs mt-8">
            بدون تسجيل · النتائج من المصدر الرسمي لوزارة العدل
          </p>
        </div>
      </section>

      {/* Stats bar — typographic */}
      <section className="border-b border-ink-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-900">+30,000</div>
              <div className="text-sm text-ink-400 mt-1">حكم قضائي</div>
            </div>
            <div className="border-r border-ink-100">
              <div className="text-3xl font-bold text-primary-900">+15</div>
              <div className="text-sm text-ink-400 mt-1">نوع محكمة</div>
            </div>
            <div className="border-r border-ink-100">
              <div className="text-3xl font-bold text-primary-900">+13</div>
              <div className="text-sm text-ink-400 mt-1">مدينة في المملكة</div>
            </div>
            <div className="border-r border-ink-100 hidden md:block">
              <div className="text-3xl font-bold text-primary-900">6</div>
              <div className="text-sm text-ink-400 mt-1">أدوات في منصة واحدة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform — typographic cards, no icon chips */}
      <section id="platform" className="max-w-6xl mx-auto px-4 py-20 md:py-24">
        <div className="max-w-2xl mb-12">
          <p className="text-primary-600 font-bold text-sm mb-3">كل ما تحتاجه</p>
          <h2 className="text-3xl md:text-5xl font-bold text-primary-900 mb-4 leading-tight">
            ست أدوات تغنيك عن عشر برامج
          </h2>
          <p className="text-ink-500 leading-relaxed">
            من أول بحث في السوابق حتى تسليم المذكرة — كل خطوة في مكان واحد، بدون تعقيد وبدون تنقل بين التطبيقات.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-[18px] border border-ink-200 p-7 hover:border-primary-300 transition-colors">
              <h3 className="font-bold text-primary-700 text-lg mb-2.5">{f.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — big quiet numbers */}
      <section className="bg-primary-50 border-y border-ink-100">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-primary-900 mb-4 leading-tight">ثلاث خطوات فقط</h2>
            <p className="text-ink-500 leading-relaxed">منصة مباشرة وسهلة — تعمل فوراً بدون تدريب أو إعداد</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t-2 border-primary-200 pt-6">
                <p className="text-5xl font-bold text-primary-100 mb-3 leading-none">{s.n}</p>
                <h3 className="text-lg font-bold text-ink-800 mb-2">{s.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For individuals and small firms */}
      <section id="firms" className="max-w-6xl mx-auto px-4 py-20 md:py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-primary-600 font-bold text-sm mb-3">للمحامين الأفراد والمكاتب الصغيرة</p>
            <h2 className="text-3xl md:text-5xl font-bold text-primary-900 mb-6 leading-tight">
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
                  <CheckCircle className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                  <span className="text-ink-500 text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
            <a
              href="/firm"
              className="inline-flex items-center gap-2 px-7 h-12 bg-primary-700 text-white rounded-full font-bold hover:bg-primary-600 transition-colors"
            >
              أنشئ مكتبك الآن
              <ArrowLeft className="w-4 h-4" />
            </a>
          </div>

          {/* Case file mockup */}
          <div className="bg-white rounded-[30px] border border-ink-200 shadow-brand p-7 md:p-8">
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-ink-100">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-primary-700" />
                <span className="font-bold text-ink-800">قضية 1446/812</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 font-semibold">نشطة</span>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-ink-400 mb-1.5">الأطراف</p>
                <p className="text-sm text-ink-600 leading-relaxed">
                  <span className="font-bold text-ink-800">شركة الرياض للتطوير</span>
                  <span className="text-ink-400 mx-1.5">ضد</span>
                  مؤسسة جدة التجارية
                </p>
              </div>
              <div className="border-t border-ink-100 pt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-ink-400">الجلسة القادمة</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sand-100 text-sand-700 font-semibold">بعد 3 أيام</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <CalendarDays className="w-4 h-4 text-ink-400" />
                  <span>15 رجب 1447هـ — مواصلة نظر الدعوى</span>
                </div>
              </div>
              <div className="border-t border-ink-100 pt-5 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-primary-600" />
                <p className="text-sm text-ink-500">المساعد الذكي: جهزت ملخص الأحكام المشابهة لقضيتك</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust points — quiet, typographic */}
      <section className="max-w-6xl mx-auto px-4 pb-20 md:pb-24">
        <div className="grid md:grid-cols-3 gap-10">
          {[
            { icon: Landmark, title: 'مصدر رسمي', body: 'جميع الأحكام من المصدر الرسمي لوزارة العدل — محاكم الدرجة الأولى والاستئناف.' },
            { icon: Scale, title: 'بياناتك ملكك', body: 'قضاياك ومستنداتك محفوظة بخصوصية تامة، ولا يطّلع عليها إلا أعضاء مكتبك.' },
            { icon: Briefcase, title: 'من ثوانٍ بدل ساعات', body: 'ابحث بالمعنى وابدأ من حيث انتهى الآخرون — بدلاً من البحث اليدوي في مئات الصفحات.' },
          ].map((item) => (
            <div key={item.title} className="border-t-2 border-ink-100 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <item.icon className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-ink-800">{item.title}</h3>
              </div>
              <p className="text-sm text-ink-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser — warm sand section */}
      <section className="bg-sand-100 border-y border-ink-100">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center">
          <h2 className="text-3xl font-bold text-primary-900 mb-3">أسعار بسيطة وواضحة</h2>
          <p className="text-ink-500 mb-10">ابدأ مجاناً وارتقِ عندما تحتاج — إلغاء في أي وقت.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <div className="bg-white rounded-[18px] border border-ink-200 px-10 py-6">
              <div className="text-2xl font-bold text-primary-900">12 <span className="text-base font-normal text-ink-400">ريال / شهر</span></div>
              <p className="text-xs text-ink-400 mt-1">للمحامي الفرد</p>
            </div>
            <div className="bg-primary-700 rounded-[18px] px-10 py-6">
              <div className="text-2xl font-bold text-white">100 <span className="text-base font-normal text-primary-100">ريال / سنة</span></div>
              <p className="text-xs text-primary-100 mt-1">وفر 30% سنوياً</p>
            </div>
          </div>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-7 h-12 bg-primary-700 text-white rounded-full font-bold hover:bg-primary-600 transition-colors"
          >
            عرض جميع الباقات
            <ArrowLeft className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-ink-500 leading-relaxed">
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
