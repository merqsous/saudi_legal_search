'use client';

import { useState, useEffect } from 'react';
import {
  Search, Briefcase, CalendarDays, Link2, Sparkles, Upload, PenTool, Users,
  BookOpen, CheckCircle, Lightbulb, ArrowLeft, Scale, Menu,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const SECTIONS = [
  { id: 'search', icon: Search, color: 'bg-primary-50 text-primary-600 border-primary-100', title: 'البحث الذكي في الأحكام' },
  { id: 'create-case', icon: Briefcase, color: 'bg-sky-50 text-sky-600 border-sky-100', title: 'إنشاء قضيتك الأولى' },
  { id: 'manage', icon: CalendarDays, color: 'bg-amber-50 text-amber-600 border-amber-100', title: 'إدارة القضايا والجلسات' },
  { id: 'link', icon: Link2, color: 'bg-teal-50 text-teal-600 border-teal-100', title: 'ربط الأحكام بالقضية' },
  { id: 'ai', icon: Sparkles, color: 'bg-violet-50 text-violet-600 border-violet-100', title: 'المساعد الذكي' },
  { id: 'documents', icon: Upload, color: 'bg-rose-50 text-rose-600 border-rose-100', title: 'رفع المستندات وتحليلها' },
  { id: 'drafting', icon: PenTool, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', title: 'صياغة المستندات' },
  { id: 'firm', icon: Users, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', title: 'مكتبك وفريقك' },
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-ink-600 text-sm leading-relaxed">{children}</span>
    </li>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-gold-50 border border-gold-200 rounded-xl p-3.5">
      <Lightbulb className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
      <p className="text-xs text-gold-800 leading-relaxed">{children}</p>
    </div>
  );
}

function Section({
  id, icon: Icon, color, title, intro, steps, tips,
}: {
  id: string; icon: React.ElementType; color: string; title: string;
  intro: string; steps: React.ReactNode; tips?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 bg-white rounded-2xl border border-ink-100 shadow-card p-7 mb-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center border`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      </div>
      <p className="text-sm text-ink-500 leading-relaxed mb-5">{intro}</p>
      <ol className="space-y-3.5 mb-5">{steps}</ol>
      {tips}
    </section>
  );
}

export default function GuidePage() {
  const [active, setActive] = useState('search');
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen app-bg" dir="rtl">
      <Header />

      {/* Page header */}
      <div className="bg-gradient-to-b from-primary-50/60 to-white border-b border-ink-100">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-primary-200 text-primary-800 text-sm font-semibold mb-5 shadow-card">
            <BookOpen className="w-4 h-4" />
            دليل الاستخدام
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-ink-900 mb-4">
            كيف تستخدم الباحث؟
          </h1>
          <p className="text-ink-500 max-w-xl mx-auto leading-relaxed">
            دليل عملي مباشر — من البحث في الأحكام، إلى إدارة قضاياك، إلى المساعد الذكي وصياغة المستندات.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          {/* Side nav */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active === s.id
                      ? 'bg-primary-50 text-primary-800 font-semibold'
                      : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Mobile nav dropdown */}
          <div className="lg:hidden mb-2">
            <button
              onClick={() => setMobileNav((v) => !v)}
              className="w-full flex items-center justify-between bg-white border border-ink-100 rounded-xl px-4 py-3 shadow-card text-sm font-semibold text-ink-800"
            >
              <span className="flex items-center gap-2">
                <Menu className="w-4 h-4" />
                المحتويات
              </span>
              <ArrowLeft className={`w-4 h-4 transition-transform ${mobileNav ? '-rotate-90' : ''}`} />
            </button>
            {mobileNav && (
              <nav className="mt-1 bg-white border border-ink-100 rounded-xl shadow-card p-1.5 space-y-0.5">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setMobileNav(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-50"
                  >
                    <s.icon className="w-4 h-4" />
                    {s.title}
                  </a>
                ))}
              </nav>
            )}
          </div>

          {/* Content */}
          <div>
            <Section
              id="search" icon={Search} color="bg-primary-50 text-primary-600 border-primary-100"
              title="البحث الذكي في الأحكام"
              intro="المحرك يبحث بالمعنى لا بالكلمة فقط — اكتب موضوع القضية بكلماتك العادية وسيفهم السياق القانوني ويجيب لك الأحكام الأقرب."
              steps={
                <>
                  <Step n={1}>سجّل الدخول برقم جوالك من الصفحة الرئيسية، ثم انتقل إلى صفحة <a href="/search" className="text-primary-700 font-medium hover:underline">البحث</a>.</Step>
                  <Step n={2}>اكتب موضوعك في خانة البحث. مثال: «تعويض عن إنهاء عقد عمل غير محدد المدة».</Step>
                  <Step n={3}>استخدم التصفية السريعة أو زر المرشحات لتضييق النتائج حسب المحكمة والمدينة والسنة ومستوى المحكمة.</Step>
                  <Step n={4}>اضغط على أي نتيجة لقراءة نص الحكم كاملاً، أو أضفها للمفضلة بضغطة على أيقونة العلامة.</Step>
                </>
              }
              tips={
                <Tip>
                  كلما كان وصفك للموضوع أدق وأشمل، كانت النتائج أفضل. اكتب الموضوع كما تشرحه لزميلك المحامي — «دعوى مطالبة مالية بقيمة شيك» أفضل من «شيك».
                </Tip>
              }
            />

            <Section
              id="create-case" icon={Briefcase} color="bg-sky-50 text-sky-600 border-sky-100"
              title="إنشاء قضيتك الأولى"
              intro="ملف القضية هو مركز عملك في الباحث — كل الأحكام والجلسات والمستندات المرتبطة بقضية واحدة تجدها هنا."
              steps={
                <>
                  <Step n={1}>من القائمة العلوية اضغط <a href="/cases" className="text-primary-700 font-medium hover:underline">القضايا</a> ثم «قضية جديدة».</Step>
                  <Step n={2}>اكتب عنواناً مميزاً للقضية، ثم أضف اسم <strong>المدعي</strong> و<strong>المدعي عليه</strong>، وحدد أيهما موكل مكتبك.</Step>
                  <Step n={3}>أضف رقم القضية والسنة والمحكمة والمدينة إن كانت معلومة — جميع هذه الحقول اختيارية ويمكن إكمالها لاحقاً.</Step>
                  <Step n={4}>اضغط «إنشاء القضية» — ستنتقل مباشرة إلى ملف القضية الجديد.</Step>
                </>
              }
              tips={
                <Tip>
                  حقل «موكلكم هو» يحدد أي طرف تمثل — يظهر لاحقاً مميزاً باللون في ملف القضية وسيتيح للمساعد الذكي فهم موقع موكلك من النزاع.
                </Tip>
              }
            />

            <Section
              id="manage" icon={CalendarDays} color="bg-amber-50 text-amber-600 border-amber-100"
              title="إدارة القضايا والجلسات"
              intro="سجّل جلسات المحكمة بمواعيدها الميلادية والهجرية، وتابع القادم منها مباشرة من لوحة القضايا."
              steps={
                <>
                  <Step n={1}>افتح ملف القضية، وفي قسم «الجلسات» اضغط زر «جلسة».</Step>
                  <Step n={2}>أدخل التاريخ (والوقت إن علمته)، والتاريخ الهجري، وموضوع الجلسة — مثال: «مواصلة نظر الدعوى وسماع الشهود».</Step>
                  <Step n={3}>بعد انعقاد الجلسة اضغط علامة الصح لتعليمها «منعقدة»، أو أيقونة الساعة لتعليمها «مؤجلة».</Step>
                  <Step n={4}>راقب الجلسات القادمة من لوحة القضايا: الجلسة خلال 3 أيام تظهر باللون الأحمر، وخلال أسبوع بالبرتقالي.</Step>
                </>
              }
            />

            <Section
              id="link" icon={Link2} color="bg-teal-50 text-teal-600 border-teal-100"
              title="ربط الأحكام بالقضية"
              intro="أثناء بحثك، اربط أي حكم ذي صلة بملف قضيتك بضغطة واحدة — لتجمع مرجعك القانوني كاملاً في مكان واحد."
              steps={
                <>
                  <Step n={1}>ابحث عن الموضوع المطلوب من صفحة البحث كالمعتاد.</Step>
                  <Step n={2}>في بطاقة النتيجة المرادة، اضغط أيقونة <strong>حقيبة الملفات</strong> (بجوار أيقونة المفضلة).</Step>
                  <Step n={3}>اختر القضية التي تريد ربط الحكم بها من القائمة الظاهرة.</Step>
                  <Step n={4}>ستجد الحكم ضمن «الأحكام المرتبطة» في ملف القضية، متاحاً للمساعد الذكي والصياغة.</Step>
                </>
              }
              tips={
                <Tip>
                  الأحكام المرتبطة بالقضية هي مصدر استشهاد المساعد الذكي وصياغة المستندات — كلما ربطت أحكاماً أدق كانت النتائج أقوى.
                </Tip>
              }
            />

            <Section
              id="ai" icon={Sparkles} color="bg-violet-50 text-violet-600 border-violet-100"
              title="المساعد الذكي"
              intro="مساعد قانوني يعرف تفاصيل قضيتك — الأطراف والجلسات والأحكام المرتبطة — ويبحث في قاعدة الأحكام السعودية ليدعم إجاباته بالسوابق."
              steps={
                <>
                  <Step n={1}>افتح ملف القضية وانزل إلى قسم «المساعد الذكي».</Step>
                  <Step n={2}>ابدأ من الأسئلة الجاهزة أو اكتب سؤالك مباشرة. مثال: «ما نقاط القوة في موقف موكلنا؟».</Step>
                  <Step n={3}>إذا احتاج السؤال سوابق قضائية، سيبحث المساعد تلقائياً في قاعدة الأحكام ويذكر أرقامها ومحاكمها في الإجابة.</Step>
                  <Step n={4}>واصل الحوار بأسئلة متابعة — المساعد يتذكر سياق المحادثة السابقة.</Step>
                </>
              }
              tips={
                <Tip>
                  المساعد يعتمد على معلومات ملف القضية — كلما أكملت بيانات الأطراف والجلسات وربطت أحكاماً أكثر، كانت إجاباته أدق.
                </Tip>
              }
            />

            <Section
              id="documents" icon={Upload} color="bg-rose-50 text-rose-600 border-rose-100"
              title="رفع المستندات وتحليلها"
              intro="ارفع صحائف الدعاوى والعقود والمذكرات، ودع المساعد يستخلص لك الملخص والنقاط القانونية والمخاطر."
              steps={
                <>
                  <Step n={1}>في ملف القضية، انتقل إلى قسم «مستندات القضية» واضغط «رفع مستند».</Step>
                  <Step n={2}>اختر ملف PDF أو Word (حتى 10 ميجابايت) — سيستخرج النص تلقائياً.</Step>
                  <Step n={3}>اضغط «تحليل» للحصول على ملخص تنفيذي ونقاط قانونية ومواعيد ومبالغ ومخاطر تستحق الانتباه.</Step>
                  <Step n={4}>اسأل أسئلة محددة عن المستند من خانة السؤال داخل نافذة التحليل.</Step>
                </>
              }
              tips={
                <Tip>
                  المستندات الممسوحة ضوئياً (صور) قد لا يستخرج نصها — يفضل رفع النسخ الأصلية الرقمية بصيغة PDF نصي أو Word.
                </Tip>
              }
            />

            <Section
              id="drafting" icon={PenTool} color="bg-indigo-50 text-indigo-600 border-indigo-100"
              title="صياغة المستندات"
              intro="ولّد لوائح الدعاوى ومذكرات الدفاع والآراء القانونية من بيانات قضيتك والأحكام المرتبطة بها — ثم صدّرها إلى Word."
              steps={
                <>
                  <Step n={1}>في ملف القضية، انتقل إلى قسم «صياغة المستندات» واضغط «مستند جديد».</Step>
                  <Step n={2}>اختر نوع المستند: لائحة دعوى، مذكرة دفاع، خطاب رسمي، أو رأي قانوني.</Step>
                  <Step n={3}>أضف تعليماتك للمساعد. مثال: «ركز على مطالبة التعويض عن الأضرار المادية فقط».</Step>
                  <Step n={4}>بعد التوليد، راجع المستند وعدّله ثم صدّره بصيغة Word بضغطة واحدة.</Step>
                </>
              }
              tips={
                <Tip>
                  المستندات المولدة مسودة أولى ذكية — راجعها ودقّق مرجعياتها قبل اعتمادها؛ المساعد لا يغني عن مراجعة المحامي.
                </Tip>
              }
            />

            <Section
              id="firm" icon={Users} color="bg-emerald-50 text-emerald-600 border-emerald-100"
              title="مكتبك وفريقك"
              intro="اعمل منفرداً أو مع فريقك — أنشئ مكتبك وادعُ المحامين برقم الجوال لتشاركوا القضايا نفسها."
              steps={
                <>
                  <Step n={1}>من القائمة العلوية اضغط <a href="/firm" className="text-primary-700 font-medium hover:underline">المكتب</a> ثم «إنشاء مكتب» واكتب اسم المكتب.</Step>
                  <Step n={2}>ادعُ الأعضاء برقم جوالهم — المسجّلون ينضمون فوراً، وغير المسجّلين تنضم دعوتهم تلقائياً عند تسجيلهم.</Step>
                  <Step n={3}>كل قضية جديدة ينشئها أي عضو تصبح مشتركة بين أعضاء المكتب، وتظهر عند الجميع في لوحة القضايا.</Step>
                  <Step n={4}>مالك المكتب يمكنه إزالة الأعضاء، ولا يمكن حذف القضية إلا من قبل منشئها.</Step>
                </>
              }
              tips={
                <Tip>
                  ابدأ بحساب فردي دون مكتب — يمكنك إنشاء المكتب في أي وقت لاحقاً وستنتقل قضاياك إليه ويشاركها فريقك.
                </Tip>
              }
            />

            {/* CTA */}
            <div className="bg-gradient-to-l from-primary-700 to-primary-600 rounded-2xl p-8 text-center">
              <Scale className="w-8 h-8 text-white/80 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">جاهز للبدء؟</h2>
              <p className="text-sm text-primary-100 mb-6">ابدأ بأول بحث أو أنشئ قضيتك الأولى — التسجيل مجاني</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a href="/search" className="px-6 py-3 bg-white text-primary-800 rounded-xl font-semibold hover:bg-primary-50 transition-colors flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  ابدأ البحث
                </a>
                <a href="/cases" className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  أنشئ قضية
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2.5 mt-6 bg-ink-50 border border-ink-100 rounded-xl p-4">
              <CheckCircle className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-500 leading-relaxed">
                واجهتك صعوبة في أي خطوة؟ فريق الدعم جاهز لمساعدتك من صفحة <a href="/support" className="text-primary-700 font-medium hover:underline">الدعم الفني</a>، وتجد إجابات الأسئلة الشائعة في <a href="/faq" className="text-primary-700 font-medium hover:underline">الأسئلة الشائعة</a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
