import { redirect } from 'next/navigation';

export default function VPSPage() {
  // Not a supported page in the redesigned UI.
  // Keep route for compatibility and redirect to a primary experience.
  redirect('/account');
}
