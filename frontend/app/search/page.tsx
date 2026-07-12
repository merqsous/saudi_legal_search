import { Metadata } from 'next';
import { Scale, Search } from 'lucide-react';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  title: 'بحث الأحكام القضائية السعودية | الباحث',
  description:
    'ابحث في آلاف الأحكام القضائية السعودية. فلترة حسب نوع المحكمة والمدينة والسنة. محرك بحث قانوني متخصص.',
  openGraph: {
    title: 'بحث الأحكام القضائية السعودية | الباحث',
    description: 'ابحث في آلاف الأحكام القضائية السعودية. فلترة حسب نوع المحكمة والمدينة والسنة.',
    url: 'https://albaheth.app/search',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
  alternates: {
    canonical: 'https://albaheth.app/search',
  },
  robots: 'index, follow',
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <noscript>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-4 mx-auto">
            <Scale className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">بحث الأحكام القضائية السعودية</h1>
          <p className="text-lg text-slate-600 mb-8">
            ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف.
            فلترة حسب نوع المحكمة والمدينة والسنة. محرك بحث قانوني متخصص في الأحكام السعودية.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <Search className="w-6 h-6 text-primary-600 mx-auto mb-2" />
              <h2 className="font-bold text-slate-900 text-sm">بحث ذكي</h2>
              <p className="text-xs text-slate-500">ابحث بالمعنى لا بالكلمة المفتاحية فقط</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <Scale className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <h2 className="font-bold text-slate-900 text-sm">أحكام موثوقة</h2>
              <p className="text-xs text-slate-500">أحكام من محاكم المملكة العربية السعودية</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <h2 className="font-bold text-slate-900 text-sm">محاكم متنوعة</h2>
              <p className="text-xs text-slate-500">تجارية، عامة، تنفيذية، واستئناف</p>
            </div>
          </div>
        </div>
      </noscript>

      <div className="hidden">
        <h1>بحث الأحكام القضائية السعودية</h1>
        <p>
          ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف.
          فلترة حسب نوع المحكمة والمدينة والسنة. محرك بحث قانوني متخصص في الأحكام السعودية.
        </p>
        <p>
          يشمل البحث أحكام المحاكم التجارية، المحاكم العامة، محاكم التنفيذ، ومحاكم الاستئناف
          في مدن المملكة العربية السعودية المختلفة مثل الرياض وجدة ومكة المكرمة والمدينة المنورة.
        </p>
      </div>

      <SearchClient />
    </div>
  );
}
