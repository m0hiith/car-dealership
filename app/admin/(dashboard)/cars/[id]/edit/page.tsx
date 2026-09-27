import type { Metadata } from 'next';
import { ComingSoon } from '@/components/admin/coming-soon';

export const metadata: Metadata = { title: 'Edit car' };

export default function Page() {
  return <ComingSoon title="Edit car" phase={4} />;
}
