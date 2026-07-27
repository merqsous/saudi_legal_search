import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://albaheth.app'),
  title: 'الباحث - محرك بحث الأحكام القضائية السعودية',
  description:
    'ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف. منصة متخصصة للمحامين والباحثين في القانون السعودي.',
  openGraph: {
    title: 'الباحث - محرك بحث الأحكام القضائية السعودية',
    description: 'ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف.',
    url: 'https://albaheth.app',
    siteName: 'الباحث',
    locale: 'ar_SA',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'الباحث - محرك بحث الأحكام القضائية السعودية' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'الباحث - محرك بحث الأحكام القضائية السعودية',
    description: 'ابحث في آلاف الأحكام القضائية السعودية من محاكم الدرجة الأولى ومحكمة الاستئناف.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
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
        <link rel="stylesheet" href="https://cdn.moyasar.com/moyasar.css" />
      </head>
      <body>
        <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18318854762" strategy="afterInteractive" />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18318854762');
          `}
        </Script>
        <Script id="structured-data" strategy="afterInteractive">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "الباحث",
              "url": "https://albaheth.app",
              "description": "محرك بحث الأحكام القضائية السعودية",
              "inLanguage": "ar-SA",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://albaheth.app/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }
          `}
        </Script>
        <Script id="org-data" strategy="afterInteractive">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "الباحث",
              "url": "https://albaheth.app",
              "logo": "https://albaheth.app/logo-icon.png",
              "description": "منصة متخصصة للبحث في الأحكام القضائية السعودية",
              "sameAs": ["https://x.com/albahethapp"]
            }
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
