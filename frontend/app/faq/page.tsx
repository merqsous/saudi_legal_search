import { Metadata } from 'next';
import { Search, Scale, FileText, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة | الباحث - محرك بحث الأحكام القضائية السعودية',
  description:
    'أسئلة شائعة عن منصة الباحث لبحث الأحكام القضائية السعودية. كيف يعمل البحث الدلالي، ما هي أنواع المحاكم المتوفرة، كيفية الاشتراك والمزيد.',
  alternates: {
    canonical: 'https://albaheth.app/faq',
  },
  robots: 'index, follow',
  openGraph: {
    title: 'الأسئلة الشائعة | الباحث',
    description: 'أسئلة شائعة عن منصة الباحث لبحث الأحكام القضائية السعودية.',
    url: 'https://albaheth.app/faq',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

const faqs = [
  {
    q: 'ما هو الباحث؟',
    a: 'الباحث هو محرك بحث ذكي متخصص في الأحكام القضائية السعودية. يتيح للمحامين والمستشارين والباحثين القانونيين البحث في آلاف الأحكام الصادرة من محاكم الدرجة الأولى ومحكمة الاستئناف في المملكة العربية السعودية باستخدام البحث الدلالي الذي يفهم المعنى لا مجرد الكلمات المفتاحية.',
  },
  {
    q: 'كيف يعمل البحث الدلالي؟',
    a: 'البحث الدلالي يستخدم تقنيات الذكاء الاصطناعي لفهم معنى استعلام البحث بدلاً من مطابقة الكلمات المفتاحية فقط. هذا يعني أنك يمكنك البحث بوصف الموضوع القانوني بكلماتك الخاصة، وسيجد المحرك الأحكام ذات الصلة حتى لو استخدمت مصطلحات مختلفة عن النص الأصلي للحكم.',
  },
  {
    q: 'ما أنواع المحاكم المتوفرة في الباحث؟',
    a: 'يشمل الباحث أحكام المحاكم التجارية، المحاكم العامة، محاكم التنفيذ، ومحاكم الاستئناف في مختلف مدن المملكة العربية السعودية مثل الرياض وجدة ومكة المكرمة والمدينة المنورة وغيرها.',
  },
  {
    q: 'هل يمكنني البحث بدون تسجيل؟',
    a: 'نعم، يمكنك تجربة الباحث بدون تسجيل. تحصل على 3 عمليات بحث مجانية للاطلاع على الأحكام وتجربة المنصة قبل الاشتراك.',
  },
  {
    q: 'ما هي الدراسة القانونية التحليلية؟',
    a: 'مع كل بحث، يقوم الباحث بتوليد دراسة قانونية تحليلية شاملة تستخلص المبادئ القانونية من الأحكام المرتبطة، وتحلل كيف تعاملت المحاكم مع القضايا المشابهة، وتقدم خلاصة وتوصيات عملية. هذه الميزة متاحة للمشتركين فقط.',
  },
  {
    q: 'كم سعر الاشتراك؟',
    a: 'نقدم باقتين: باقة شهرية بـ 149 ريال شهرياً، وباقة سنوية بـ 1,490 ريال سنوياً. حالياً نقدم خصم 50% على الباقة السنوية لأول 10 مشتركين، أي 745 ريال فقط سنوياً.',
  },
  {
    q: 'هل الأحكام موثوقة؟',
    a: 'نعم، جميع الأحكام في الباحث مصدرها وزارة العدل السعودية. يتم استخراج الأحكام من المصدر الرسمي وتضمين رقم الحكم وتاريخه ورابط المصدر الأصلي.',
  },
  {
    q: 'هل يمكنني فلترة النتائج؟',
    a: 'نعم، يمكنك فلترة نتائج البحث حسب نوع المحكمة (تجارية، عامة، تنفيذية)، المدينة، السنة، ودرجة المحكمة (الدرجة الأولى أو الاستئناف). كما تتوفر فلترة حسب قسم الحكم (الوقائع، الأسباب، الحكم).',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'نعم، نحن نأخذ خصوصية المستخدمين على محمل الجد. لا نشارك بياناتك مع أي طرف ثالث. يمكنك الاطلاع على سياسة الخصوصية الكاملة في صفحة الخصوصية.',
  },
  {
    q: 'كيف أتواصل مع الدعم؟',
    a: 'يمكنك التواصل معنا عبر البريد الإلكتروني: albahethapp@gmail.com وسنرد عليك في أقرب وقت ممكن.',
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo-square.png" alt="الباحث" className="w-10 h-10 rounded-xl" />
          </a>
          <div className="flex items-center gap-4">
            <a href="/search" className="text-sm font-medium text-slate-600 hover:text-primary-600">البحث</a>
            <a href="/pricing" className="text-sm font-medium text-slate-600 hover:text-primary-600">الأسعار</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">الأسئلة الشائعة</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            كل ما تحتاج معرفته عن منصة الباحث لبحث الأحكام القضائية السعودية
          </p>
        </div>

        <div className="space-y-4 mb-12">
          {faqs.map((faq, idx) => (
            <details key={idx} className="bg-white rounded-xl border border-slate-200 p-5 group">
              <summary className="font-bold text-slate-900 cursor-pointer flex items-center justify-between list-none">
                {faq.q}
                <span className="text-primary-600 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="mt-3 text-slate-600 leading-relaxed text-sm">{faq.a}</p>
            </details>
          ))}
        </div>

        {/* SEO Content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">بحث الأحكام القضائية السعودية</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            منصة الباحث هي أول محرك بحث دلالي متخصص في الأحكام القضائية السعودية. تتيح للمحامين
            والمستشارين القانونيين والباحثين البحث في آلاف الأحكام الصادرة من مختلف المحاكم
            في المملكة العربية السعودية، بما في ذلك المحاكم التجارية والمحاكم العامة ومحاكم التنفيذ
            ومحاكم الاستئناف.
          </p>
          <p className="text-slate-700 leading-relaxed mb-4">
            يتميز الباحث بالبحث الدلالي الذكي الذي يفهم المعنى القانوني لاستعلام البحث،
            مما يسهل العثور على الأحكام ذات الصلة حتى لو لم تتطابق الكلمات المفتاحية بدقة.
            كما يقدم المحرك دراسة قانونية تحليلية شاملة لكل بحث، تستخلص المبادئ القانونية
            وتحلل التوجهات القضائية في القضايا المشابهة.
          </p>
          <p className="text-slate-700 leading-relaxed">
            تشمل قاعدة بيانات الباحث أحكاماً من مدن متعددة مثل الرياض وجدة ومكة المكرمة
            والمدينة المنورة وبريدة والدمام وغيرها، مع إمكانية الفلترة حسب نوع المحكمة
            والمدينة والسنة ودرجة المحكمة. جميع الأحكام مصدرها وزارة العدل السعودية.
          </p>
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
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: f.a,
              },
            })),
          }),
        }}
      />

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-slate-600">
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
