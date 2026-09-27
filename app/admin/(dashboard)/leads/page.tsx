import type { Metadata } from 'next';
import { ComingSoon } from '@/components/admin/coming-soon';

export const metadata: Metadata = { title: 'Leads' };

export default function Page() {
  return <ComingSoon title="Leads" phase={9} />;
}
