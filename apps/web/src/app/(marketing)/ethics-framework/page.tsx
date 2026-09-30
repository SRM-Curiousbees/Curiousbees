import type { Metadata } from 'next';
import { MarketingPage, PointGrid } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'Ethics framework',
  description: 'What CuriousBees expects of everyone who shares research on the platform.',
};

export default function EthicsFrameworkPage() {
  return (
    <MarketingPage
      label="Ethics framework"
      title="Research shared here should be work you can stand behind."
      intro="These are the expectations for everyone using CuriousBees. They sit alongside SRMIST’s own research regulations, which take precedence."
      cta={false}
    >
      <PointGrid
        points={[
          {
            title: 'Integrity',
            body: 'Share only genuine results. Fabricating, falsifying or misrepresenting data, methods or findings is not acceptable.',
          },
          {
            title: 'Original work',
            body: 'Credit the work, ideas and words of others. Presenting someone else’s work as your own is a serious violation.',
          },
          {
            title: 'Responsible use of AI',
            body: 'AI tools can help with drafting and analysis, but disclose their use and remain responsible for everything you publish.',
          },
          {
            title: 'Fair authorship',
            body: 'Credit everyone who made a meaningful contribution. Ghost and honorary authorship are not acceptable.',
          },
          {
            title: 'Respect for confidentiality',
            body: 'Don’t share unpublished work from a workspace outside it without the permission of its members.',
          },
          {
            title: 'Reporting concerns',
            body: 'Use “Report post” on anything that breaks these expectations, or raise it with your supervisor or institute administrator.',
          },
        ]}
      />
    </MarketingPage>
  );
}
