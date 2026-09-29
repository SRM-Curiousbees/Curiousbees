import React from 'react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import HeroSection from '@/components/marketing/HeroSection';
import RolesSection from '@/components/marketing/RolesSection';
import WorkflowSection from '@/components/marketing/WorkflowSection';
import FAQSection from '@/components/marketing/FAQSection';
import CTASection from '@/components/marketing/CTASection';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export default function MarketingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <MarketingNavbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <RolesSection />
        <WorkflowSection />
        <FAQSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  );
}
