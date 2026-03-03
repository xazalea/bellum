import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4 text-red-500">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-8">The page you are looking for does not exist or has been moved.</p>
      <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
        Go back to Home
      </a>
    </div>
  );
}
