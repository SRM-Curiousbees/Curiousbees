import type { Metadata } from 'next';
import { MarketingPage, Prose } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms for using CuriousBees at SRM Institute of Science and Technology.',
};

// Update this date whenever the terms change.
const LAST_UPDATED = '30 September 2026';

export default function TermsOfServicePage() {
  return (
    <MarketingPage label="Legal" title="Terms of service" intro="The terms for using CuriousBees at SRMIST." cta={false}>
      <Prose updated={LAST_UPDATED}>
        <p>
          By signing in to CuriousBees you agree to these terms and to SRMIST’s policies. They govern your use of the platform within SRM Institute of Science and
          Technology.
        </p>

        <h2>1. Who can use CuriousBees</h2>
        <p>
          Accounts are created by SRMIST for scholars, supervisors and administrators. Signing in confirms that the account is yours and that you are authorised to
          use it.
        </p>

        <h2>2. Your responsibilities</h2>
        <ul>
          <li>Keep your sign-in credentials to yourself. You are responsible for activity on your account.</li>
          <li>Uphold academic integrity. Plagiarism, data fabrication and intellectual property theft are prohibited.</li>
          <li>Use the platform for legitimate research and collaboration.</li>
        </ul>

        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Upload malicious code or try to compromise the platform’s security.</li>
          <li>Share unpublished research from a workspace outside it without its members’ permission.</li>
          <li>Harass, abuse or harm other users.</li>
        </ul>

        <h2>4. Intellectual property</h2>
        <p>
          Work you upload remains the intellectual property of its authors and/or SRMIST, in line with SRMIST’s intellectual property guidelines. CuriousBees claims
          no ownership of your research.
        </p>

        <h2>5. Changes and suspension</h2>
        <p>
          SRMIST may change, suspend or discontinue parts of the platform. Accounts that break these terms or university policy may be suspended or closed.
        </p>
      </Prose>
    </MarketingPage>
  );
}
