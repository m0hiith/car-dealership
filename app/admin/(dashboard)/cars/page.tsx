import type { Metadata } from 'next';
import { ComingSoon } from '@/components/admin/coming-soon';

export const metadata: Metadata = { title: 'Cars' };

export default function Page() {
  return <ComingSoon title="Cars" phase={5} />;
}
