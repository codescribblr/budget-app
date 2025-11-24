import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/icon.svg" 
              alt="Budget App" 
              width={40} 
              height={40}
              className="dark:hidden"
            />
            <Image 
              src="/icon-darkmode.svg" 
              alt="Budget App" 
              width={40} 
              height={40}
              className="hidden dark:block"
            />
            <span className="text-xl font-bold">Budget App</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Budget App, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Use License</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Permission is granted to use Budget App for personal, non-commercial budgeting and financial management purposes. This license shall automatically terminate if you violate any of these restrictions.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Modify or copy the application materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to reverse engineer any software contained in Budget App</li>
              <li>Remove any copyright or proprietary notations</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To use Budget App, you must:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Be at least 13 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update your account information if it changes</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You are responsible for maintaining the confidentiality of your password and account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Subscription and Billing</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Free Trial</h3>
            <p className="text-muted-foreground leading-relaxed">
              Premium subscriptions include a 60-day free trial. You will not be charged during the trial period. After the trial ends, your subscription will automatically renew at the current monthly rate unless you cancel before the trial period ends.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Subscription Fees</h3>
            <p className="text-muted-foreground leading-relaxed">
              Premium subscriptions are billed monthly at $5/month. All fees are in USD and are non-refundable except as required by law. We reserve the right to change our pricing with 30 days notice.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Cancellation</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period. You will retain access to premium features until the end of the paid period.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Payment Processing</h3>
            <p className="text-muted-foreground leading-relaxed">
              Payments are processed securely through Stripe. We do not store your credit card information. By providing payment information, you authorize us to charge the applicable fees to your payment method.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">User Content and Data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You retain all rights to the financial data and information you enter into Budget App. By using our service, you grant us a license to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Store and process your data to provide the service</li>
              <li>Create backups of your data for security purposes</li>
              <li>Use aggregated, anonymized data for analytics and improvements</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You are responsible for the accuracy of the information you provide and for maintaining backups of your important data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree not to use Budget App:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>For any unlawful purpose or to violate any laws</li>
              <li>To transmit any harmful code, viruses, or malware</li>
              <li>To harass, abuse, or harm another person</li>
              <li>To impersonate or attempt to impersonate another user</li>
              <li>To interfere with or disrupt the service or servers</li>
              <li>To attempt to gain unauthorized access to any part of the service</li>
              <li>To use automated systems to access the service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              Budget App is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, secure, or error-free. We do not provide financial advice, and the application should not be used as a substitute for professional financial guidance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall Budget App or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use Budget App, even if we have been notified of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless Budget App and its affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to terminate or suspend your account and access to the service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the service shall be resolved in the courts of the United States.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms constitute the entire agreement between you and Budget App regarding the use of the service and supersede all prior agreements and understandings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Email: support@budgetapp.com
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link href="/">
            <Button variant="outline">← Back to Home</Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-muted/50 mt-12">
        <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Budget App. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

