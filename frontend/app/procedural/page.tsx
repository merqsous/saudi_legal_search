import { Metadata } from 'next';
import { Suspense } from 'react';
import { Search } from 'lucide-react';
import ProceduralClient from './ProceduralClient';

export const metadata: Metadata = {
  title: 'الأسئلة الإجرائية | الباحث - إجابات من تجارب حقيقية',
  description:
    'ابحث في آلاف الأسئلة الإجرائية القانونية وأجوبتها — إجراءات ناجز، التنفيذ، الإيجار، العمل، والعقود من تجارب أشخاص حقيقيين.',
  robots: 'index, follow',
};

export default function ProceduralPage() {
  return (
    <div className="min-h-screen bg-ink-50" dir="rtl">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Search className="w-8 h-8 text-primary-600 animate-pulse" /></div>}>
        <ProceduralClient />
      </Suspense>
    </div>
  );
}
