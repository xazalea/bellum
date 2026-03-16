export default function PrivacyPage() {
  return (
    <div className="py-12">
      <div className="container-max max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect minimal information necessary to provide our services:
              account credentials (email, username), usage analytics, and theme preferences.
              All data is stored locally in your browser when possible.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              Your information is used to provide and improve the platform, authenticate your account,
              and personalize your experience (such as recently played games and theme preferences).
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Storage</h2>
            <p className="text-muted-foreground">
              Game preferences, recently played history, and theme settings are stored in your browser's
              localStorage. Uploaded APK and EXE files are processed entirely in your browser and
              are never transmitted to our servers.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground">
              Games are loaded through our edge proxy from their original sources.
              We do not share your personal data with third parties.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Security</h2>
            <p className="text-muted-foreground">
              All applications run in sandboxed browser environments. We employ industry-standard
              security measures to protect your data and ensure safe execution of uploaded files.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
