import type { Metadata } from 'next';
import { MarketingPage, PointGrid } from '@/components/marketing/MarketingPage';

export const metadata: Metadata = {
  title: 'For institutions',
  description: 'Institute administrators manage accounts, the institution’s structure, moderation and the audit trail.',
};

export default function InstitutionPage() {
  return (
    <MarketingPage
      label="For institute administrators"
      title={
        <>
          Run the research network <em className="font-normal italic">without</em> joining the conversation.
        </>
      }
      intro="Administrators govern CuriousBees: who has access, how the institution is organised, and what stays on the platform. They don’t post, comment or join research workspaces."
    >
      <PointGrid
        points={[
          {
            title: 'Accounts',
            body: 'Create scholar and supervisor accounts with the right role, faculty and department, and suspend or restore access when needed.',
          },
          {
            title: 'Institution structure',
            body: 'Maintain campuses, faculties and departments, so people and their work sit in the right place.',
          },
          {
            title: 'Supervision oversight',
            body: 'See supervision requests and supervisor assignments across the institution.',
          },
          {
            title: 'Moderation',
            body: 'Posts that members report are flagged for review. Hide or restore posts and publications.',
          },
          {
            title: 'Announcements',
            body: 'Share institution-wide notices with researchers.',
          },
          {
            title: 'Audit trail',
            body: 'Sensitive actions, such as approvals, role changes and moderation, are recorded in an audit log.',
          },
        ]}
      />
    </MarketingPage>
  );
}
