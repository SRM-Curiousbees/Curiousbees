import { Injectable } from '@nestjs/common';

export interface PermissionCapability {
  id: string;
  category: string;
  capability: string;
  description: string;
  scholar: boolean | string;
  supervisor: boolean | string;
  admin: boolean | string;
}

@Injectable()
export class AdminRolesService {
  getPermissionsMatrix(): {
    roles: string[];
    capabilities: PermissionCapability[];
  } {
    return {
      roles: ['RESEARCH_SCHOLAR', 'RESEARCH_SUPERVISOR', 'INSTITUTE_ADMIN'],
      capabilities: [
        {
          id: 'acc-manage',
          category: 'Account & Identity',
          capability: 'Account Registration & Login',
          description: 'Authenticate and maintain an institutional research identity.',
          scholar: true,
          supervisor: true,
          admin: true,
        },
        {
          id: 'profile-manage',
          category: 'Account & Identity',
          capability: 'Research Profile Management',
          description: 'Edit research bio, domains, interests, and external scholarly links.',
          scholar: true,
          supervisor: true,
          admin: false,
        },
        {
          id: 'sup-select',
          category: 'Supervision',
          capability: 'Supervisor Selection & Request',
          description: 'Search faculty supervisors and initiate formal supervision request.',
          scholar: true,
          supervisor: false,
          admin: false,
        },
        {
          id: 'sup-approval',
          category: 'Supervision',
          capability: 'Supervisor Review & Acceptance',
          description: 'Review prospective scholar applications and accept/reject supervision.',
          scholar: false,
          supervisor: true,
          admin: false,
        },
        {
          id: 'sup-manage',
          category: 'Supervision',
          capability: 'Supervised Scholar Mentorship',
          description: 'Guide assigned scholars, review progress reports, and advise research.',
          scholar: false,
          supervisor: true,
          admin: false,
        },
        {
          id: 'res-workspace',
          category: 'Research & Collaboration',
          capability: 'Project Workspaces & Nexus',
          description: 'Participate in 9-tab collaborative research workspaces.',
          scholar: true,
          supervisor: true,
          admin: 'View Oversight',
        },
        {
          id: 'pub-author',
          category: 'Research & Collaboration',
          capability: 'Publication Authoring',
          description: 'Draft, publish, and link research papers to institutional profile.',
          scholar: true,
          supervisor: true,
          admin: false,
        },
        {
          id: 'feed-post',
          category: 'Community & Content',
          capability: 'Research Feed & Collaboration',
          description: 'Post, comment, react, follow researchers and topics, and collaborate. Admins reach users through announcements.',
          scholar: true,
          supervisor: true,
          admin: false,
        },
        {
          id: 'mod-report',
          category: 'Governance & Security',
          capability: 'Report Inappropriate Content',
          description: 'Flag policy violations or abuse to university administration (admins act on them in the moderation queue).',
          scholar: true,
          supervisor: true,
          admin: false,
        },
        {
          id: 'mod-actions',
          category: 'Governance & Security',
          capability: 'Content Moderation Queue',
          description: 'Review reports, hide/restore content, resolve moderation tickets.',
          scholar: false,
          supervisor: false,
          admin: true,
        },
        {
          id: 'user-suspension',
          category: 'Governance & Security',
          capability: 'Account Suspension & Deactivation',
          description: 'Suspend or reactivate user accounts with mandatory audited reason.',
          scholar: false,
          supervisor: false,
          admin: true,
        },
        {
          id: 'sup-reassign',
          category: 'Governance & Security',
          capability: 'Administrative Supervisor Reassignment',
          description: 'Institutionally reassign scholar supervision with audit trail.',
          scholar: false,
          supervisor: false,
          admin: true,
        },
        {
          id: 'inst-config',
          category: 'Institution Management',
          capability: 'Faculty & Department Configuration',
          description: 'Create, update, and manage institutional faculties, departments, and campuses.',
          scholar: false,
          supervisor: false,
          admin: true,
        },
        {
          id: 'audit-logs',
          category: 'Audit & Compliance',
          capability: 'Immutable Audit Center Access',
          description: 'Access complete institutional audit trail and security anomaly logs.',
          scholar: 'Own Activity',
          supervisor: 'Own Activity',
          admin: true,
        },
        {
          id: 'sys-settings',
          category: 'System Configuration',
          capability: 'Platform & Security Settings',
          description: 'Configure institutional auth, Brevo email settings, and security policies.',
          scholar: false,
          supervisor: false,
          admin: true,
        },
      ],
    };
  }
}
