import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage, Prose } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What CuriousBees collects, how it is used, and who can see it.',
};

// Update this date whenever the policy text changes.
const LAST_UPDATED = '30 September 2026';

export default function PrivacyPolicyPage() {
  return (
    <MarketingPage label="Legal" title="Privacy policy" intro="What CuriousBees collects, why, and who can see it." cta={false}>
      <Prose updated={LAST_UPDATED}>
        <p>
          CuriousBees (“we”, “the platform”) is the research collaboration platform of SRM Institute of Science and Technology (SRMIST). This policy explains how
          information is handled on it.
        </p>

        <h2>1. What we collect</h2>
        <ul>
          <li>
            <strong>Account details</strong> from SRMIST and from Google sign-in: your name, email address and profile picture, and the role, faculty and department
            your institution assigned.
          </li>
          <li>
            <strong>What you add</strong>: your profile and research areas, research record and milestones, progress reports, publications, posts, comments,
            messages, workspace files and meetings.
          </li>
          <li>
            <strong>Connected apps</strong>: if you connect Google Workspace or Zoom, the tokens needed to create meetings and chat spaces for you. You can disconnect
            them in Settings at any time.
          </li>
          <li>
            <strong>Security records</strong>: a log of sensitive actions, such as approvals, role changes and moderation, which can include the IP address they
            came from.
          </li>
        </ul>

        <h2>2. How it is used</h2>
        <ul>
          <li>To sign you in and give you access that matches your role.</li>
          <li>To run supervision, workspaces, the research feed, opportunities and notifications.</li>
          <li>To show you relevant posts, people and opportunities based on your research areas and who and what you follow.</li>
          <li>To give institute administrators aggregate figures, such as the number of users, posts and workspaces.</li>
        </ul>

        <h2>3. Who can see it</h2>
        <ul>
          <li>Profiles, posts and opportunities are visible only to signed-in members of SRMIST. They are not public on the web.</li>
          <li>
            Workspace files, updates and meetings are visible only to that workspace’s members. Uploaded files open through links that expire after a few minutes.
          </li>
          <li>
            Institute administrators manage accounts and moderate posts and publications. For oversight they can see a workspace’s title, members and activity
            counts, but not its files, updates or messages.
          </li>
          <li>We do not sell your data.</li>
          <li>Data is encrypted in transit (HTTPS) and at rest in the platform’s database and file storage.</li>
        </ul>

        <h2>4. Your rights and retention</h2>
        <p>
          You can ask to see, correct or delete your personal data, subject to SRMIST’s retention rules for academic records. Research records are kept in line with
          SRMIST’s archival requirements.
        </p>

        <h2>5. Contact</h2>
        <p>
          For privacy questions, or to exercise your rights, contact SRMIST’s data protection officer or use the <Link href="/contact">contact page</Link>.
        </p>
      </Prose>
    </MarketingPage>
  );
}
