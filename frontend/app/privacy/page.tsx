import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | الباحث - محرك بحث الأحكام القضائية السعودية',
  description:
    'سياسة خصوصية منصة الباحث. كيف نجمع ونستخدم ونحمي بياناتك الشخصية عند استخدام محرك بحث الأحكام القضائية السعودية.',
  alternates: {
    canonical: 'https://albaheth.app/privacy',
  },
  robots: 'index, follow',
  openGraph: {
    title: 'سياسة الخصوصية | الباحث',
    description: 'سياسة خصوصية منصة الباحث لبحث الأحكام القضائية السعودية.',
    url: 'https://albaheth.app/privacy',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-8">سياسة الخصوصية</h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. البيانات التي نجمعها</h2>
            <p className="text-slate-700 leading-relaxed text-sm mb-2">نجمع البيانات التالية لتقديم وتحسين خدماتنا:</p>
            <ul className="space-y-2 text-sm text-slate-700 mr-4">
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> <strong>بيانات الحساب:</strong> الاسم، رقم الهاتف (للمستخدمين المسجلين)</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> <strong>استعلامات البحث:</strong> النص الذي تبحث عنه والفلاتر المستخدمة</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> <strong>البيانات التقنية:</strong> عنوان IP، نوع المتصفح، البلد</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> <strong>بيانات الاستخدام:</strong> عدد عمليات البحث، الأحكام التي تم الاطلاع عليها</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. كيف نستخدم بياناتك</h2>
            <ul className="space-y-2 text-sm text-slate-700 mr-4">
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> تقديم خدمة البحث في الأحكام القضائية</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> توليد الدراسات القانونية التحليلية</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> تحسين جودة نتائج البحث وأداء المنصة</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> تحليل الاستخدام لإحصائيات لوحة التحكم</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> التواصل معك بخصوص حسابك واشتراكك</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. حماية البيانات</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              نتخذ إجراءات تقنية وتنظيمية لحماية بياناتك، بما في ذلك تشفير الاتصالات عبر HTTPS،
              وتخزين كلمات المرور بشكل مشفر، وتقييد الوصول لقواعد البيانات. لا نشارك بياناتك
              الشخصية مع أي طرف ثالث لأغراض تجارية.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. ملفات تعريف الارتباط (Cookies)</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              نستخدم ملفات تعريف الارتباط والتخزين المحلي في المتصفح لحفظ جلسة المستخدم
              وتفضيلات البحث. يمكنك مسح هذه البيانات من إعدادات متصفحك في أي وقت.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. خدمات الطرف الثالث</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              نستخدم خدمات خارجية لتشغيل المنصة، بما في ذلك:
            </p>
            <ul className="space-y-2 text-sm text-slate-700 mr-4 mt-2">
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> OpenAI — لتوليد التضمينات الدلالية والدراسات القانونية</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> Google Analytics / Google Ads — لتحليل الاستخدام والإعلانات</li>
              <li className="flex items-start gap-2"><span className="text-primary-500 shrink-0">•</span> قاعدة بيانات PostgreSQL مستضافة — لتخزين بيانات المستخدمين والأحكام</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. حقوق المستخدم</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              لديك الحق في الوصول إلى بياناتك الشخصية، طلب تصحيحها أو حذفها. لطلب حذف حسابك
              وبياناتك، تواصل معنا عبر البريد الإلكتروني: albahethapp@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. الأطفال</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              المنصة مخصصة للمستخدمين فوق سن 18 عاماً. لا نجمع عمداً بيانات من القاصرين.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. التحديثات</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سننشر أي تغييرات على هذه الصفحة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. التواصل</h2>
            <p className="text-slate-700 leading-relaxed text-sm">
              لأي استفسار بخصوص الخصوصية، يرجى التواصل عبر البريد الإلكتروني:
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
