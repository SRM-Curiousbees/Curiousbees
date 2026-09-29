import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  FileCheck2,
  FileText,
  FolderGit2,
  GraduationCap,
  History,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Network,
  Settings,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  Bell,
} from 'lucide-react';
import type { UserRole } from '@curiousbees/types';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/** Navigation per role. Routes and labels mirror lib/auth/permissions.ts. */
const ADMIN_NAV: NavSection[] = [
  { items: [{ name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }] },
  {
    title: 'People & access',
    items: [
      { name: 'Scholars', href: '/admin/users?tab=SCHOLARS', icon: GraduationCap },
      { name: 'Supervisors', href: '/admin/users?tab=SUPERVISORS', icon: UserCheck },
      { name: 'Administrators', href: '/admin/users?tab=ADMINS', icon: Shield },
      { name: 'Roles & Permissions', href: '/admin/roles-permissions', icon: Lock },
      { name: 'Suspended Accounts', href: '/admin/users?tab=SUSPENDED', icon: ShieldAlert },
    ],
  },
  {
    title: 'Institution',
    items: [
      { name: 'Faculties & Depts', href: '/admin/faculties-departments', icon: Building },
      { name: 'Campuses', href: '/admin/campuses', icon: MapPin },
      { name: 'Directory', href: '/admin/directory', icon: Users },
    ],
  },
  {
    title: 'Research governance',
    items: [
      { name: 'Research Activity', href: '/admin/research-activity', icon: BarChart3 },
      { name: 'Workspaces', href: '/admin/research-workspaces', icon: FolderGit2 },
      { name: 'Publications', href: '/admin/publications', icon: BookOpen },
      { name: 'Compliance', href: '/admin/compliance', icon: FileCheck2 },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { name: 'Posts & Discussions', href: '/admin/posts', icon: MessageSquare },
      { name: 'Publication Review', href: '/admin/publication-moderation', icon: BookMarked },
      { name: 'Reports & Queue', href: '/admin/moderation', icon: ShieldAlert },
    ],
  },
  {
    title: 'Communication',
    items: [
      { name: 'Announcements', href: '/admin/announcements', icon: FileText },
      { name: 'Notification Center', href: '/admin/notifications', icon: Bell },
      { name: 'Email Delivery', href: '/admin/email-delivery', icon: Mail },
    ],
  },
  {
    title: 'Insight & audit',
    items: [
      { name: 'Institutional Analytics', href: '/admin/analytics', icon: BarChart3 },
      { name: 'Audit Center', href: '/admin/audit', icon: History },
      { name: 'Security Events', href: '/admin/security', icon: Lock },
      { name: 'System Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

const SUPERVISOR_NAV: NavSection[] = [
  {
    items: [
      { name: 'Research Feed', href: '/feed', icon: MessageSquare },
      { name: 'Supervision Panel', href: '/my-scholars', icon: UserCheck },
      { name: 'Research Workspaces', href: '/workspace', icon: FolderGit2 },
      { name: 'Publications', href: '/publications', icon: BookOpen },
    ],
  },
  {
    title: 'Discover',
    items: [
      { name: 'Researchers', href: '/researchers', icon: Users },
      { name: 'Events', href: '/events', icon: Calendar },
      { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
      { name: 'Curious Nexus', href: '/nexus', icon: Network },
    ],
  },
  { title: 'Account', items: [{ name: 'Settings', href: '/settings', icon: Settings }] },
];

const SCHOLAR_NAV: NavSection[] = [
  {
    items: [
      { name: 'Research Feed', href: '/feed', icon: MessageSquare },
      { name: 'My Research', href: '/my-research', icon: BookMarked },
      { name: 'Research Workspaces', href: '/workspace', icon: FolderGit2 },
      { name: 'Publications', href: '/publications', icon: BookOpen },
    ],
  },
  {
    title: 'Discover',
    items: [
      { name: 'Researchers', href: '/researchers', icon: Users },
      { name: 'Events', href: '/events', icon: Calendar },
      { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
      { name: 'Curious Nexus', href: '/nexus', icon: Network },
    ],
  },
  { title: 'Account', items: [{ name: 'Settings', href: '/settings', icon: Settings }] },
];

export function getNavSections(role: UserRole | undefined): NavSection[] {
  if (role === 'INSTITUTE_ADMIN') return ADMIN_NAV;
  if (role === 'RESEARCH_SUPERVISOR') return SUPERVISOR_NAV;
  return SCHOLAR_NAV;
}

export const ROLE_LABEL: Record<string, string> = {
  INSTITUTE_ADMIN: 'Institute Admin',
  RESEARCH_SUPERVISOR: 'Research Supervisor',
  RESEARCH_SCHOLAR: 'Research Scholar',
};

/** True when `href` (optionally with ?tab=) matches the current location. */
export function isNavItemActive(href: string, pathname: string, tab: string | null): boolean {
  const [path, query] = href.split('?');
  if (query) {
    return pathname === path && new URLSearchParams(query).get('tab') === tab;
  }
  return pathname === path || pathname.startsWith(path + '/');
}

/** Section + item for the current location, used for the top-bar context line. */
export function findNavContext(
  role: UserRole | undefined,
  pathname: string,
  tab: string | null,
): { section?: string; item?: NavItem } {
  for (const section of getNavSections(role)) {
    for (const item of section.items) {
      if (isNavItemActive(item.href, pathname, tab)) return { section: section.title, item };
    }
  }
  return {};
}
