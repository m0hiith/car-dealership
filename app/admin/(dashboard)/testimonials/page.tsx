import type { Metadata } from 'next';
import { TestimonialsManager } from '@/components/admin/content/testimonials-manager';
import { requireAdmin } from '@/lib/auth';
import { getAdminTestimonials } from '@/lib/queries/admin-content';

export const metadata: Metadata = { title: 'Testimonials' };

export default async function TestimonialsPage() {
  await requireAdmin();
  const testimonials = await getAdminTestimonials();
  return <TestimonialsManager testimonials={testimonials} />;
}
