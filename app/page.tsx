import Link from 'next/link';

// Temporary placeholder until the public homepage is built (phase 8).
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-headline-lg-mobile text-navy md:text-headline-lg">Scaffold ready</h1>
      <Link href="/styleguide" className="text-label-lg text-action underline-offset-4 hover:underline">
        View the styleguide
      </Link>
    </main>
  );
}
