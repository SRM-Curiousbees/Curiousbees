import type { Metadata } from 'next';
import { MarketingPage, PointGrid } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'For research scholars',
  description: 'Find a supervisor, track your doctorate from proposal to thesis, report progress and collaborate across SRMIST.',
};

export default function ResearchScholarsPage() {
  return (
    <MarketingPage
      label="For research scholars"
      title={
        <>
          Your doctorate, from proposal to thesis, <em className="font-normal italic">in one place.</em>
        </>
      }
      intro="CuriousBees keeps supervision, your research record and the people you work with together, so less of it lives in email threads and shared drives."
    >
      <PointGrid
        points={[
          {
            title: 'Find a supervisor',
            body: 'Browse supervisors in your department, see how many places they have, and send a request with your working title and a message.',
          },
          {
            title: 'Keep a research record',
            body: 'Record your stage from proposal to thesis, set milestones with due dates, and keep the materials from your workspaces in one list.',
          },
          {
            title: 'Report progress',
            body: 'Send progress reports to your supervisor and read their response: on track, more information needed, or delayed.',
          },
          {
            title: 'Share your work',
            body: 'Post updates, papers and questions to the institution’s research feed. Comment, and follow people and topics to shape what you see.',
          },
          {
            title: 'Collaborate',
            body: 'Ask a researcher to collaborate from their post or profile. Accepted requests open a conversation in Curious Nexus.',
          },
          {
            title: 'Find opportunities',
            body: 'Positions, projects and fellowships posted by researchers. Apply by link, by email, or with a join request in your department.',
          },
        ]}
      />
    </MarketingPage>
  );
}
