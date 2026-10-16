import { MetadataRoute } from 'next';
import { judgmentSlug, slugify } from '@/lib/slug';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://albaheth.app';
  // Backend runs in the same container on port 8000 (see next.config.js rewrites).
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/procedural`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const pres = await fetch(`${apiUrl}/api/procedural/ids?limit=5000`, { cache: 'no-store' });
    if (pres.ok) {
      const pdata = await pres.json();
      const threads: { id: number; question: string | null; created_at: string | null }[] = pdata.ids || [];
      staticPages.push(
        ...threads.map((t) => {
          const slug = t.question ? slugify(t.question) : '';
          return {
            url: `${baseUrl}/procedural/${t.id}${slug ? `/${slug}` : ''}`,
            lastModified: t.created_at ? new Date(t.created_at) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          };
        })
      );
    }
  } catch (e) {
    console.error('[sitemap] procedural fetch error:', e);
  }

  try {
    const res = await fetch(`${apiUrl}/api/judgments/ids?limit=49000`, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[sitemap] fetch failed: ${res.status}`);
      return staticPages;
    }
    const data = await res.json();
    const items: { id: number; scraped_at: string | null; court_type: string | null; court_level: string | null; city: string | null; judgment_number: string | null }[] = data.ids || [];

    const judgmentUrls: MetadataRoute.Sitemap = items.map((item) => {
      const slug = judgmentSlug(item);
      return {
        url: `${baseUrl}/judgment/${item.id}${slug ? `/${slug}` : ''}`,
        lastModified: item.scraped_at ? new Date(item.scraped_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });

    return [...staticPages, ...judgmentUrls];
  } catch (e) {
    console.error('[sitemap] fetch error:', e);
    return staticPages;
  }
}
