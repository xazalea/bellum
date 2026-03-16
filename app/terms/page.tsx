export default function TermsPage() {
  return (
    <div className="py-12">
      <div className="container-max max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Challenger Gaming Platform, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the platform.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">2. Use of Service</h2>
            <p className="text-muted-foreground">
              Challenger provides a web-based gaming platform that allows users to play HTML5 games,
              run Android APK files, and execute Windows EXE files in a sandboxed browser environment.
              You agree to use the service only for lawful purposes and in accordance with these terms.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Content</h2>
            <p className="text-muted-foreground">
              You are responsible for any content you upload to the platform, including APK and EXE files.
              You represent that you have the right to use and distribute any files you upload.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Challenger platform, including its design, code, and branding, is the intellectual property
              of Challenger Gaming. Games accessed through the platform remain the property of their respective owners.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Challenger is provided "as is" without warranties of any kind. We are not liable for any damages
              arising from the use of uploaded files or third-party content.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
