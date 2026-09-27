import type { Metadata } from 'next';
import { ComingSoon } from '@/components/admin/coming-soon';

export const metadata: Metadata = { title: 'Testimonials' };

export default function Page() {
  return <ComingSoon title="Testimonials" phase={8} />;
}
