import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { judgmentSlug } from '@/lib/slug';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface JudgmentData {
  id: number;
  judgment_number: string | null;
  judgment_year: string | null;
  judgment_type: string | null;
  judgment_date_hijri: string | null;
  details_url: string | null;
  full_text: string | null;
  case_number: string | null;
  case_year: string | null;
  court_type: string | null;
  court_type_code: string | null;
  city: string | null;
  court_level: string | null;
  court_level_code: string | null;
}

interface Chunk {
  id: number;
  chunk_text: string;
  chunk_order: number;
}

interface RelatedJudgment {
  id: number;
  judgment_number: string | null;
  judgment_year: string | null;
  judgment_date_hijri: string | null;
  court_type: string | null;
  court_level: string | null;
  city: string | null;
}

async function getJudgment(id: string): Promise<{ judgment: JudgmentData; chunks: Chunk[] } | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${apiUrl}/api/judgment/${id}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRelatedJudgments(id: string): Promise<RelatedJudgment[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${apiUrl}/api/judgments/related/${id}?limit=5`, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { params: string[] } }): Promise<Metadata> {
  const id = params.params[0];
  const data = await getJudgment(id);
  if (!data) {
    return {
      title: 'الحكم غير موجود | الباحث',
      robots: 'noindex',
    };
  }
  const j = data.judgment;
  const slug = judgmentSlug(j);
  const canonicalUrl = `https://albaheth.app/judgment/${id}${slug ? `/${slug}` : ''}`;
  const titleParts = [
    `حكم ${j.court_type || 'قضائي'}`,
    j.court_level ? `محكمة ${j.court_level}` : '',
    j.city ? `في ${j.city}` : '',
    j.judgment_number ? `رقم ${j.judgment_number}` : `رقم ${id}`,
  ].filter(Boolean);
  const title = `${titleParts.join(' ')} | الباحث`;
  const description = `الحكم ${j.court_type || 'القضائي'} ${j.court_level ? `(${j.court_level})` : ''} ${j.city ? `في ${j.city}` : ''} رقم ${j.judgment_number || id}. اقرأ نص الحكم كاملاً على الباحث - محرك بحث الأحكام القضائية السعودية.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'الباحث',
      locale: 'ar_SA',
      type: 'article',
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: 'index, follow',
  };
}

export default async function JudgmentPage({ params }: { params: { params: string[] } }) {
  const id = params.params[0];
  const data = await getJudgment(id);
  if (!data) notFound();

  const j = data.judgment;
  const chunks = data.chunks;
  const related = await getRelatedJudgments(id);

  const fullText = j.full_text || chunks.map((c) => c.chunk_text).join('\n\n');
  const slug = judgmentSlug(j);
  const canonicalUrl = `https://albaheth.app/judgment/${id}${slug ? `/${slug}` : ''}`;

  // Breadcrumb items
  const breadcrumbs = [
    { name: 'الباحث', url: 'https://albaheth.app' },
    { name: 'بحث الأحكام', url: 'https://albaheth.app/search' },
  ];
  if (j.court_type) breadcrumbs.push({ name: j.court_type, url: 'https://albaheth.app/search' });
  breadcrumbs.push({ name: `حكم رقم ${j.judgment_number || j.id}`, url: canonicalUrl });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" dir="rtl">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-600 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/><path d="M7 12l5-7 5 7"/><path d="M7 12l5 7 5-7"/></svg>
            </div>
            <span className="text-xl font-bold text-slate-900">الباحث</span>
          </a>
          <a href="/search" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            البحث
          </a>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="max-w-4xl mx-auto px-4 py-3" aria-label="breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          {breadcrumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1">
              {i < breadcrumbs.length - 1 ? (
                <>
                  <a href={crumb.url} className="hover:text-primary-600 transition-colors">{crumb.name}</a>
                  <span className="text-slate-300">/</span>
                </>
              ) : (
                <span className="text-slate-700 font-medium">{crumb.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 leading-relaxed">
            حكم {j.court_type || 'قضائي'} {j.court_level ? `— محكمة ${j.court_level}` : ''} {j.city ? `في ${j.city}` : ''} رقم {j.judgment_number || j.id}
          </h1>

          <div className="flex flex-wrap gap-2 mb-6">
            {j.court_level && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-amber-50 text-amber-700">
                {j.court_level}
              </span>
            )}
            {j.court_type && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700">
                {j.court_type}
              </span>
            )}
            {j.city && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-slate-100 text-slate-700">
                {j.city}
              </span>
            )}
            {j.judgment_date_hijri && (
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-primary-50 text-primary-700">
                {j.judgment_date_hijri}
              </span>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 mb-3">البيانات الأساسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {j.case_number && (
                <div>
                  <span className="text-slate-500">رقم القضية:</span>
                  <span className="font-medium text-slate-700 mr-1">{j.case_number}/{j.case_year || ''}</span>
                </div>
              )}
              {j.judgment_number && (
                <div>
                  <span className="text-slate-500">رقم الحكم:</span>
                  <span className="font-medium text-slate-700 mr-1">{j.judgment_number}</span>
                </div>
              )}
              {j.judgment_year && (
                <div>
                  <span className="text-slate-500">سنة الحكم:</span>
                  <span className="font-medium text-slate-700 mr-1">{j.judgment_year}</span>
                </div>
              )}
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-lg font-bold text-slate-900 mb-3">نص الحكم</h2>
            <div className="text-slate-700 leading-loose whitespace-pre-wrap arabic-text">
              {fullText || 'نص الحكم غير متوفر.'}
            </div>
          </div>

          {j.details_url && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <a
                href={j.details_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                المصدر الأصلي
              </a>
            </div>
          )}
        </article>

        {/* Related Judgments - Internal Linking */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">أحكام ذات صلة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {related.map((r) => (
                <a
                  key={r.id}
                  href={`/judgment/${r.id}/${judgmentSlug(r)}`}
                  className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {r.court_level && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {r.court_level}
                      </span>
                    )}
                    {r.court_type && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {r.court_type}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">
                    حكم رقم {r.judgment_number || r.id}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {r.city && <span>{r.city}</span>}
                    {r.judgment_date_hijri && <span>{r.judgment_date_hijri}</span>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 bg-gradient-to-l from-primary-50 to-white border border-primary-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">ابحث في آلاف الأحكام</h2>
          <p className="text-sm text-slate-600 mb-4">
            استخدم الباحث للبحث الذكي في الأحكام القضائية السعودية.
          </p>
          <a
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            ابدأ البحث
          </a>
        </section>
      </main>

      <footer className="border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
          الباحث — بحث في الأحكام القضائية السعودية
        </div>
      </footer>

      {/* LegalDocument Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LegalDocument',
            name: `حكم رقم ${j.judgment_number || j.id} ${j.court_type ? `- ${j.court_type}` : ''}`,
            description: `حكم قضائي سعودي ${j.court_type ? `(${j.court_type})` : ''} ${j.court_level ? `- ${j.court_level}` : ''} ${j.city ? `في ${j.city}` : ''}`,
            url: canonicalUrl,
            datePublished: j.judgment_date_hijri || '',
            jurisdiction: {
              '@type': 'AdministrativeArea',
              name: 'المملكة العربية السعودية',
            },
            court: j.court_level || j.court_type || '',
            author: {
              '@type': 'Organization',
              name: 'وزارة العدل السعودية',
            },
            isBasedOn: j.details_url || '',
          }),
        }}
      />

      {/* BreadcrumbList Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: crumb.name,
              item: crumb.url,
            })),
          }),
        }}
      />
    </div>
  );
}
