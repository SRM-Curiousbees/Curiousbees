import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin } from 'lucide-react';
import { MarketingPage } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to get access to CuriousBees, and who to contact for help.',
};

// Set NEXT_PUBLIC_CONTACT_EMAIL to publish a contact address. Nothing is shown until it is.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

const TOPICS = [
  { subject: 'Request access to CuriousBees', title: 'Request access', body: 'Your name, department, role (scholar or supervisor) and the email address you sign in with.' },
  { subject: 'Problem signing in to CuriousBees', title: 'Trouble signing in', body: 'The email address you tried and what you saw on screen.' },
  { subject: 'Question about CuriousBees', title: 'Anything else', body: 'Questions about the platform or how your data is handled.' },
];

export default function ContactPage() {
  return (
    <MarketingPage
      label="Contact"
      title="Get access, or get help."
      intro="CuriousBees accounts are created by SRMIST. There’s no public sign-up, so access requests go to the people who manage the platform."
      cta={false}
    >
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:py-24">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">What to include</h2>
            <ul className="mt-8 space-y-6">
              {TOPICS.map((t) => (
                <li key={t.title} className="border-t border-line-strong pt-5">
                  <h3 className="text-lg font-semibold tracking-tight text-ink">{t.title}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-ink-secondary">{t.body}</p>
                  {CONTACT_EMAIL && (
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t.subject)}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
                    >
                      <Mail className="size-4" aria-hidden />
                      Email about this
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-8">
            <div className="rounded-2xl border border-line bg-surface-muted p-6">
              <h2 className="text-base font-semibold text-ink">Already have an account?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                Your institute administrator can fix access, roles and departments. Once you’re signed in, the{' '}
                <Link href="/help" className="font-medium text-brand hover:underline">
                  help page
                </Link> answers most questions about how things work.
              </p>
            </div>
            {CONTACT_EMAIL ? (
              <div>
                <h2 className="text-base font-semibold text-ink">Email</h2>
                <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 inline-flex items-center gap-2 text-base font-medium text-brand hover:underline">
                  <Mail className="size-4" aria-hidden />
                  {CONTACT_EMAIL}
                </a>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-ink-muted">
                Contact your department’s research coordinator or the Directorate of Research at SRMIST.
              </p>
            )}
            <div>
              <h2 className="text-base font-semibold text-ink">SRM Institute of Science and Technology</h2>
              <p className="mt-2 flex gap-2 text-sm leading-relaxed text-ink-secondary">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                <span>
                  Kattankulathur, Chengalpattu District
                  <br />
                  Tamil Nadu 603203, India
                </span>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </MarketingPage>
  );
}
