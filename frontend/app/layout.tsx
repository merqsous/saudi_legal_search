import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://albaheth.app'),
  title: 'الباحث - محرك بحث الأحكام القضائية السعودية | ناجز | قضاء | قانون',
  description:
    'ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف. منصة قانونية متخصصة للمحامين والمستشارين والباحثين في القانون السعودي ونظام ناجز.',
  keywords: [
    'أحكام قضائية سعودية',
    'محكمة',
    'قانون سعودي',
    'بحث قانوني',
    'محامي',
    'استئناف',
    'الدرجة الأولى',
    'الرياض',
    'المدينة المنورة',
    'ناجز',
    'وزارة العدل',
    'القضاء السعودي',
    'الأنظمة السعودية',
    'قضايا تجارية',
    'أحكام محكمة الاستئناف',
    'أحكام محاكم الدرجة الأولى النهائية',
    'الوقائع',
    'البيانات الأساسية',
    'القضاء',
    'الشرع',
    'نظام المرافعات الشرعية',
  ],
  openGraph: {
    title: 'الباحث - محرك بحث الأحكام القضائية السعودية',
    description: 'ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف.',
    url: 'https://albaheth.app',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
  },
  robots: 'index, follow',
  other: {
    'google': 'notranslate',
    'google-site-verification': 'google-site-verification=googled0f7de8c3eeeeec9.html',
  },
  alternates: {
    canonical: 'https://albaheth.app',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
