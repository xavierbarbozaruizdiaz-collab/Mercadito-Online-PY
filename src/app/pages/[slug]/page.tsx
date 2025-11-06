import { getPageBySlug } from '@/lib/services/staticPagesService';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { notFound } from 'next/navigation';

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <article className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold mb-4">{page.title}</h1>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
          />
        </article>
      </div>
    </main>
  );
}

