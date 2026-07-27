import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/favorites', '/studies', '/api'],
    },
    sitemap: 'https://albaheth.app/sitemap.xml',
  };
}
