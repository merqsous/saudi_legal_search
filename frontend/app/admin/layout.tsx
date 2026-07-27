import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'لوحة التحكم | الباحث',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
