import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الشروط والأحكام | الباحث - محرك بحث الأحكام القضائية السعودية',
  description:
    'الشروط والأحكام لاستخدام منصة الباحث لبحث الأحكام القضائية السعودية. أحكام الاستخدام، الاشتراك، الخصوصية والمسؤولية القانونية.',
  alternates: {
    canonical: 'https://albaheth.app/terms',
  },
  robots: 'index, follow',
  openGraph: {
    title: 'الشروط والأحكام | الباحث',
    description: 'الشروط والأحكام لاستخدام منصة الباحث لبحث الأحكام القضائية السعودية.',
    url: 'https://albaheth.app/terms',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="https://albaheth.app" className="flex items-center gap-3">
            <img src="/logo-square.png" alt="الباحث" className="w-10 h-10 rounded-xl" />
          </a>
          <a href="/search" className="text-sm font-medium text-primary-600 hover:text-primary-700">البحث</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">الشروط والأحكام</h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. قبول الشروط</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              باستخدامك لمنصة الباحث، فإنك توافق على هذه الشروط والأحكام كاملة. إذا كنت لا توافق
              على أي جزء من هذه الشروط، يرجى عدم استخدام المنصة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. وصف الخدمة</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              الباحث هو محرك بحث ذكي متخصص في الأحكام القضائية السعودية. يقدم خدمات البحث الدلالي
              في الأحكام، وتوليد دراسات قانونية تحليلية، وفلترة النتائج حسب نوع المحكمة والمدينة
              والسنة. الخدمة متاحة للمستخدمين المسجلين وغير المسجلين ضمن حدود محددة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. الاشتراك والأسعار</h2>
            <p className="text-slate-700 leading-relaxed text-sm mb-2">
              تقدم المنصة باقتين مدفوعتين: باقة شهرية وباقة سنوية. الأسعار موضحة في صفحة الأسعار.
              عرض خصم 50% لأول 10 مشتركين ساري حتى نفاد الأماكن.
            </p>
            <p className="text-slate-700 leading-relaxed text-sm">
              يتم تجديد الاشتراك تلقائياً ما لم يتم إلغاؤه قبل تاريخ التجديد. يمكن إلغاء الاشتراك
              في أي وقت من خلال التواصل مع الدعم.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. استخدام الخدمة</h2>
            <p className="text-slate-700 leading-relaxed text-sm mb-2">
              يلتزم المستخدم باستخدام المنصة لأغراض قانونية وأخلاقية فقط. يُمنع:
            </p>
            <ul className="space-y-2 text-sm text-slate-700 mr-4">
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> إساءة استخدام الخدمة أو محاولة الوصول غير المصرح به للأنظمة</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> نسخ أو إعادة توزيع الأحكام لأغراض تجارية دون إذن</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> استخدام أدوات آلية لاستخراج البيانات بشكل جماعي</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> مشاركة حساب الاشتراك مع أطراف أخرى</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. مصدر الأحكام</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              جميع الأحكام القضائية في الباحث مصدرها وزارة العدل السعودية. المنصة تعرض الأحكام
              كما هي من المصدر الرسمي دون تعديل. الباحث ليس مسؤولاً عن محتوى الأحكام أو دقتها
              القانونية — الأحكام هي وثائق قضائية رسمية صادرة عن المحاكم السعودية.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. الدراسة القانونية التحليلية</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              الدراسة القانونية التحليلية التي يقدمها الباحث هي محتوى مولد بواسطة الذكاء الاصطناعي
              بناءً على الأحكام المرتبطة. هذه الدراسة لأغراض إرشادية وتثقيفية فقط ولا تُعد استشارة
              قانونية. يُنصح المستخدم بالرجوع لمصدر الحكم الأصلي واستشارة محامٍ مختص في القضايا الفعلية.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. إخلاء المسؤولية</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              تقدم المنصة خدماتها "كما هي" دون ضمانات صريحة أو ضمنية. الباحث غير مسؤول عن أي
              أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الخدمة أو الاعتماد على المحتوى المعروض.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. التعديلات</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              يحتفظ الباحث بحق تعديل هذه الشروط والأحكام أو الأسعار في أي وقت. سيتم إشعار
              المشتركين بأي تغييرات جوهرية عبر البريد الإلكتروني.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. التواصل</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              لأي استفسار بخصوص الشروط والأحكام، يرجى التواصل عبر البريد الإلكتروني:
              albahethapp@gmail.com
            </p>
          </section>
        </div>
      </main>

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
