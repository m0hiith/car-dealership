import type { Metadata } from 'next';
import { ComingSoon } from '@/components/admin/coming-soon';

export const metadata: Metadata = { title: 'Add car' };

export default function Page() {
  return <ComingSoon title="Add car" phase={4} />;
}
