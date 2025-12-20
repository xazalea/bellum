import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

export type DocEntry = {
  slug: string;
  fileName: string;
  title: string;
  description: string;
};

const DOCS_DIR = path.join(process.cwd(), 'docs');

function slugify(fileName: string) {
  return fileName.replace(/\.md$/i, '').toLowerCase();
}

function extractTitleAndDescription(markdown: string, fallbackTitle: string): { title: string; description: string } {
  const lines = markdown.split(/\r?\n/);
  let title = '';
  for (const l of lines) {
    const m = l.match(/^#\s+(.+)\s*$/);
    if (m) {
      title = m[1].trim();
      break;
    }
  }
  if (!title) title = fallbackTitle;

  // first "paragraph-ish" line after the title
  let desc = '';
  let seenTitle = false;
  for (const l of lines) {
    if (!seenTitle) {
      if (/^#\s+/.test(l)) seenTitle = true;
      continue;
    }
    const t = l.trim();
    if (!t) continue;
    if (t.startsWith('#')) continue;
    desc = t;
    break;
  }
  return { title, description: desc };
}

export function listDocs(): DocEntry[] {
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  return files.map((fileName) => {
    const full = path.join(DOCS_DIR, fileName);
    const md = fs.readFileSync(full, 'utf8');
    const fallbackTitle = fileName.replace(/\.md$/i, '').replace(/_/g, ' ');
    const { title, description } = extractTitleAndDescription(md, fallbackTitle);
    return {
      slug: slugify(fileName),
      fileName,
      title,
      description,
    };
  });
}

export function readDocBySlug(slug: string): { entry: DocEntry; markdown: string } | null {
  const safe = slug.replace(/\.\./g, '').replace(/\//g, '');
  const fileName = safe.toUpperCase() + '.md';
  const full = path.join(DOCS_DIR, fileName);
  if (!fs.existsSync(full)) return null;
  const md = fs.readFileSync(full, 'utf8');
  const fallbackTitle = fileName.replace(/\.md$/i, '').replace(/_/g, ' ');
  const { title, description } = extractTitleAndDescription(md, fallbackTitle);
  return {
    entry: { slug: safe.toLowerCase(), fileName, title, description },
    markdown: md,
  };
}


