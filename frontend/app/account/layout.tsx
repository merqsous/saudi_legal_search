import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حسابي | الباحث',
  robots: 'noindex, nofollow',
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
