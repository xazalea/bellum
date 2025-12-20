import { notFound } from 'next/navigation';
import { readDocBySlug } from '@/lib/server/docs';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function markdownToHtml(md: string): string {
  // Minimal markdown renderer: headings + code fences + paragraphs.
  const lines = md.split(/\r?\n/);
  let out = '';
  let inCode = false;
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    if (line.startsWith('```')) {
      inCode = !inCode;
      out += inCode ? '<pre class="ui-doc-pre"><code>' : '</code></pre>';
      continue;
    }
    if (inCode) {
      out += escapeHtml(line) + '\n';
      continue;
    }
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      out += `<h1 class="ui-doc-h1">${escapeHtml(h1[1])}</h1>`;
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      out += `<h2 class="ui-doc-h2">${escapeHtml(h2[1])}</h2>`;
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      out += `<h3 class="ui-doc-h3">${escapeHtml(h3[1])}</h3>`;
      continue;
    }
    const t = line.trim();
    if (!t) {
      out += '<div class="ui-doc-spacer"></div>';
      continue;
    }
    out += `<p class="ui-doc-p">${escapeHtml(t)}</p>`;
  }
  return out;
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = readDocBySlug(params.slug);
  if (!doc) return notFound();
  const html = markdownToHtml(doc.markdown);

  return (
    <div className="w-full">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/75">
        <span className="material-symbols-outlined text-[16px] text-amber-300">description</span>
        {doc.entry.fileName}
      </div>

      <div className="mt-7 overflow-hidden rounded-[2rem] border-2 border-white/80 bg-[#070b16]/60 p-8 shadow-[0_26px_90px_rgba(0,0,0,0.55)]">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}


