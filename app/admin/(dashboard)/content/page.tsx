import type { Metadata } from 'next';
import { ComingSoon } from '@/components/admin/coming-soon';

export const metadata: Metadata = { title: 'Homepage content' };

export default function Page() {
  return <ComingSoon title="Homepage content" phase={8} />;
}
