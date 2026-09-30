import type { Metadata } from 'next';
import { MarketingPage, PointGrid } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'For supervisors',
  description: 'Review supervision requests, follow your scholars’ progress and work together in private research workspaces.',
};

export default function SupervisorsPage() {
  return (
    <MarketingPage
      label="For research supervisors"
      title={
        <>
          Supervise with the <em className="font-normal italic">whole picture</em> in view.
        </>
      }
      intro="Requests, progress reports and shared work for every scholar you supervise, in one panel instead of scattered inboxes."
    >
      <PointGrid
        points={[
          {
            title: 'Decide on requests',
            body: 'Read each scholar’s proposal and message, then accept or decline with a reason. Your scholar capacity is respected automatically.',
          },
          {
            title: 'Review progress reports',
            body: 'Mark each report on track, ask for more information, or flag it as delayed, with written feedback the scholar sees.',
          },
          {
            title: 'Follow every scholar',
            body: 'See each scholar’s research stage, milestones and reports from the Supervision Panel.',
          },
          {
            title: 'Work in shared workspaces',
            body: 'Private files (up to 50 MB each), milestones you set, updates and meetings on Google Meet, Zoom or any video link.',
          },
          {
            title: 'Post opportunities',
            body: 'Scholars in your department send join requests. Accepting one creates a shared workspace for you both.',
          },
          {
            title: 'Keep your profile current',
            body: 'Your publications, research areas and profile help scholars find the right supervisor.',
          },
        ]}
      />
    </MarketingPage>
  );
}
