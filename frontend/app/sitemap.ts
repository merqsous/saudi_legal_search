import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const baseUrl = 'https://albaheth.app';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    const res = await fetch(`${apiUrl}/api/judgments/ids`, { next: { revalidate: 0 } });
    if (!res.ok) return staticPages;
    const data = await res.json();
    const ids: number[] = data.ids || [];

    const judgmentUrls: MetadataRoute.Sitemap = ids.map((id) => ({
      url: `${baseUrl}/judgment/${id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticPages, ...judgmentUrls];
  } catch {
    return staticPages;
  }
}
