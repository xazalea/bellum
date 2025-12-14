import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function XFabricPage() {
  // Legacy route: redirect to /fabrik
  redirect('/fabrik');
}
