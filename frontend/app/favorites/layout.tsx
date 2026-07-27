import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'المفضلة | الباحث',
  robots: 'noindex, nofollow',
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
