import type { Metadata } from 'next';
import { MarketingPage, PointGrid } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'About',
  description: 'CuriousBees is the research collaboration platform for SRM Institute of Science and Technology.',
};

export default function AboutPage() {
  return (
    <MarketingPage
      label="About CuriousBees"
      title={
        <>
          A research network for <em className="font-normal italic">one institution.</em>
        </>
      }
      intro="CuriousBees brings SRMIST’s doctoral scholars, supervisors and research leadership into one place: supervision, shared workspaces, and a feed for research from across departments."
    >
      <PointGrid
        title="How it’s built"
        points={[
          {
            title: 'Only your institution',
            body: 'Accounts are created by the institution, and only signed-in members can see profiles, posts and opportunities.',
          },
          {
            title: 'Private where it matters',
            body: 'Workspace files are stored privately and open only for the workspace’s members, through links that expire after a few minutes.',
          },
          {
            title: 'Governance kept separate',
            body: 'Administrators manage access and moderation but can’t take part in research activity, so oversight never becomes participation.',
          },
          {
            title: 'A clear record',
            body: 'Supervision relationships, progress reviews and administrative actions are recorded, so decisions can be traced later.',
          },
        ]}
      />
    </MarketingPage>
  );
}
