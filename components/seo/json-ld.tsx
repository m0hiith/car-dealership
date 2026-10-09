import { jsonLdString } from '@/lib/seo';

/** One schema.org object as a <script type="application/ld+json">. */
export function JsonLd({ data }: { data: unknown }) {
  // jsonLdString escapes "<", so the content cannot close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
