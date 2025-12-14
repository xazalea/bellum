import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'XFabric Console',
  description: 'XFabric (WebFabric) console — deploy, domains, analytics, and cluster edge.',
};

export default function XFabricLayout({ children }: { children: React.ReactNode }) {
  // Legacy route: redirect to /fabrik while preserving old links.
  void children;
  redirect('/fabrik');
}

