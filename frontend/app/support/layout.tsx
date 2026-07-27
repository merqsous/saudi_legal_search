import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الدعم الفني | الباحث',
  robots: 'noindex, nofollow',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
