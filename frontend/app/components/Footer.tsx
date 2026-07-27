import { Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo-rounded.png" alt="الباحث" className="w-9 h-9 rounded-lg" width={36} height={36} />
              <span className="text-lg font-bold text-white">الباحث</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              محرك بحث قانوني متخصص في الأحكام القضائية السعودية. ابحث بالمعنى في آلاف الأحكام.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">المنصة</h3>
            <ul className="space-y-2.5">
              <li><a href="/search" className="text-sm text-slate-400 hover:text-white transition-colors">البحث في الأحكام</a></li>
              <li><a href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">الأسعار والباقات</a></li>
              <li><a href="/about" className="text-sm text-slate-400 hover:text-white transition-colors">عن الباحث</a></li>
              <li><a href="/faq" className="text-sm text-slate-400 hover:text-white transition-colors">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">الدعم والقانون</h3>
            <ul className="space-y-2.5">
              <li><a href="/support" className="text-sm text-slate-400 hover:text-white transition-colors">الدعم الفني</a></li>
              <li><a href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">الشروط والأحكام</a></li>
              <li><a href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">سياسة الخصوصية</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">تواصل معنا</h3>
            <ul className="space-y-2.5">
              <li>
                <a href="mailto:albahethapp@gmail.com" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  albahethapp@gmail.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/966533226864" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  واتساب: 966533226864
                </a>
              </li>
              <li>
                <a href="https://x.com/albahethapp" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @albahethapp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} الباحث — جميع الحقوق محفوظة
          </p>
          <p className="text-xs text-slate-500">
            محرك بحث ذكي في الأحكام القضائية السعودية | محاكم الدرجة الأولى والاستئناف
          </p>
        </div>
      </div>
    </footer>
  );
}
