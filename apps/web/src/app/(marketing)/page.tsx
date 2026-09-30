import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import HeroSection from '@/components/marketing/HeroSection';
import StatementSection from '@/components/marketing/StatementSection';
import StorySection from '@/components/marketing/StorySection';
import RolesSection from '@/components/marketing/RolesSection';
import WorkflowSection from '@/components/marketing/WorkflowSection';
import FAQSection from '@/components/marketing/FAQSection';
import CTASection from '@/components/marketing/CTASection';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: { absolute: 'CuriousBees | Research collaboration at SRMIST' },
  description:
    'CuriousBees brings research supervisors, doctoral scholars and research leadership at SRM Institute of Science and Technology onto one platform: supervision, shared workspaces, milestones and research conversations.',
  alternates: { canonical: '/' },
};

/**
 * Public landing page, told in scenes: identity → why → the platform → who it is
 * for → getting started → questions → action. Server-rendered; motion comes from CSS
 * and small client islands (scroll-lit statement, story steps, role tabs, reveals).
 */
export default function MarketingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-toast focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>
      <MarketingNavbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <StatementSection />
        <StorySection />
        <RolesSection />
        <WorkflowSection />
        <FAQSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
