import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Unblocker',
  description: 'Unblocker experience.',
};

export default function UnblockerPage() {
  // We serve the unblocker UI as static assets under /public/unblocker.
  // This route simply forwards to the static entrypoint.
  redirect('/unblocker/index.html?launch=1');
}
