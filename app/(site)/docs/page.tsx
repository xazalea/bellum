import { DocsIndex } from '@/components/site/pages/DocsIndex';
import { listDocs } from '@/lib/server/docs';

export default function Page() {
  const docs = listDocs();
  return <DocsIndex docs={docs} />;
}


