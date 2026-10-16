import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { threadUrl } from '@/lib/slug';
import Header from '../../components/Header';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ThreadData {
  id: number;
  thread_id: string;
  topic: string | null;
  canonical_question: string | null;
  formal_question: string | null;
  consolidated_answer: string | null;
  formal_answer: string | null;
  status: string | null;
  confidence: string | null;
  responder_count: number | null;
  turn_count: number | null;
  source_date: string | null;
  conversation: { role: string; text: string }[] | null;
}

interface RelatedThread {
  id: number;
  formal_question: string | null;
  canonical_question: string | null;
}

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

async function getThread(id: string): Promise<{ thread: ThreadData; related: RelatedThread[] } | null> {
  try {
    const res = await fetch(`${apiBase()}/api/procedural/${id}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function threadTitle(t: ThreadData) {
  return t.formal_question || t.canonical_question || 'سؤال إجرائي';
}

export async function generateMetadata({ params }: { params: { params: string[] } }): Promise<Metadata> {
  const [id] = params.params;
  if (!/^\d+$/.test(id || '')) return {};
  const data = await getThread(id);
  if (!data) return {};
  const t = data.thread;
  const title = threadTitle(t);
  const answer = (t.formal_answer || t.consolidated_answer || '').replace(/\s+/g, ' ').slice(0, 155);
  const url = `https://albaheth.app${threadUrl(t)}`;
  return {
    title,
    description: answer || `إجابة إجرائية: ${title}`,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: answer,
      url,
      siteName: 'الباحث',
      type: 'article',
      locale: 'ar_SA',
    },
  };
}

export default async function ThreadPage({ params }: { params: { params: string[] } }) {
  const [id] = params.params;
  if (!/^\d+$/.test(id || '')) notFound();

  const data = await getThread(id);
  if (!data) notFound();
  const { thread: t, related } = data;

  const title = threadTitle(t);
  const answer = t.formal_answer || t.consolidated_answer || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: title,
      answerCount: t.responder_count || 1,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
      ...(t.source_date ? { dateCreated: t.source_date } : {}),
    },
  };

  return (
    <div className="min-h-screen app-bg">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10" dir="rtl">
        <nav className="text-xs text-ink-400 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-primary-600">الرئيسية</Link>
          <span>/</span>
          <Link href="/procedural" className="hover:text-primary-600">الأسئلة الإجرائية</Link>
          {t.topic && (
            <>
              <span>/</span>
              <span className="text-ink-500">{t.topic}</span>
            </>
          )}
        </nav>

        <article>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">إجرائي</span>
            {t.topic && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-ink-50 text-ink-500">{t.topic}</span>
            )}
            {t.confidence === 'high' && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">إجابة موثوقة</span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-ink-900 leading-relaxed mb-6">
            {title}
          </h1>

          <div className="bg-white rounded-2xl border border-ink-100 p-6 mb-8">
            <h2 className="text-sm font-bold text-primary-700 mb-3">الإجابة</h2>
            <p className="text-base text-ink-800 leading-relaxed whitespace-pre-line arabic-text">
              {answer}
            </p>
            <p className="text-xs text-ink-400 mt-4 pt-3 border-t border-ink-100">
              إجابة مبنية على تجارب ونقاشات حقيقية — لا تُغني عن استشارة قانونية رسمية
            </p>
          </div>

          {t.conversation && t.conversation.length > 0 && (
            <details className="bg-white rounded-2xl border border-ink-100 p-6 mb-8">
              <summary className="text-sm font-bold text-ink-700 cursor-pointer">
                المحادثة الأصلية ({t.turn_count || t.conversation.length} مداخلة)
              </summary>
              <div className="mt-4 space-y-3">
                {t.conversation.map((turn, i) => (
                  <div key={i} className={`text-sm leading-relaxed ${turn.role === 'responder' ? 'pr-4 border-r-2 border-primary-200' : 'pr-4 border-r-2 border-ink-200'}`}>
                    <span className="block text-[11px] font-bold text-ink-400 mb-0.5">
                      {turn.role === 'responder' ? 'مجيب' : 'سائل'}
                    </span>
                    <p className="text-ink-700 whitespace-pre-line">{turn.text}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="bg-gradient-to-l from-primary-50 to-white border border-primary-200 rounded-2xl p-6 text-center mb-10">
            <p className="text-base font-bold text-ink-800 mb-2">عندك سؤال إجرائي مشابه؟</p>
            <p className="text-sm text-ink-600 mb-4">
              ابحث في أكثر من 1,900 سؤال وجواب إجرائي — و31 ألف حكم قضائي — مجاناً
            </p>
            <Link
              href="/search"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition-colors"
            >
              ابحث في الباحث
            </Link>
          </div>

          {related.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-ink-900 mb-4">أسئلة مشابهة</h2>
              <div className="space-y-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={threadUrl(r)}
                    className="block bg-white border border-ink-100 rounded-xl p-4 hover:border-primary-300 transition-colors"
                  >
                    <p className="text-sm font-bold text-ink-800">
                      {r.formal_question || r.canonical_question}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
