import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الدراسات | الباحث',
  robots: 'noindex, nofollow',
};

export default function StudiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
