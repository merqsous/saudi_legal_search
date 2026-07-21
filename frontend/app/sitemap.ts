import { MetadataRoute } from 'next';
import { judgmentSlug } from '@/lib/slug';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const baseUrl = 'https://albaheth.app';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  ];

  try {
    const res = await fetch(`${apiUrl}/api/judgments/ids`, { next: { revalidate: 0 } });
    if (!res.ok) return staticPages;
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
  } catch {
    return staticPages;
  }
}
