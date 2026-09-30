import type { LucideIcon } from 'lucide-react';
import {
  GitMerge,
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
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
} from 'lucide-react';
import type { UserRole } from '@curiousbees/types';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Match only this exact path, not the pages below it. */
  exact?: boolean;
  /** Other path prefixes that belong to this item (e.g. detail pages that live elsewhere). */
  alsoMatches?: string[];
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
    ],
  },
  {
    title: 'Research governance',
    items: [
      { name: 'Research Activity', href: '/admin/research-activity', icon: BarChart3 },
      { name: 'Supervision Requests', href: '/admin/scholar-requests', icon: GitMerge },
      { name: 'Workspaces', href: '/admin/research-workspaces', icon: FolderGit2 },
      { name: 'Publications', href: '/admin/publications', icon: BookOpen },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { name: 'Posts & Discussions', href: '/admin/posts', icon: MessageSquare },
      { name: 'Reports & Queue', href: '/admin/moderation', icon: ShieldAlert },
    ],
  },
  {
    title: 'Communication',
    items: [
      { name: 'Announcements', href: '/admin/announcements', icon: FileText },
      { name: 'Email Delivery', href: '/admin/email-delivery', icon: Mail },
    ],
  },
  {
    title: 'Insight & audit',
    items: [
      { name: 'Institutional Analytics', href: '/admin/analytics', icon: BarChart3 },
      { name: 'Audit Center', href: '/admin/audit', icon: History },
      { name: 'System Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

const SUPERVISOR_NAV: NavSection[] = [
  {
    items: [
      { name: 'Overview', href: '/supervisor', icon: LayoutDashboard, exact: true },
      { name: 'Research Feed', href: '/feed', icon: MessageSquare },
      { name: 'Supervision Panel', href: '/my-scholars', icon: UserCheck, alsoMatches: ['/supervisor/requests', '/supervisor/approval-requests'] },
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
export function isNavItemActive(
  href: string,
  pathname: string,
  tab: string | null,
  options: Pick<NavItem, 'exact' | 'alsoMatches'> = {},
): boolean {
  const [path, query] = href.split('?');
  if (query) {
    return pathname === path && new URLSearchParams(query).get('tab') === tab;
  }
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + '/');
  if (options.alsoMatches?.some(under)) return true;
  return options.exact ? pathname === path : under(path);
}

/** Section + item for the current location, used for the top-bar context line. */
export function findNavContext(
  role: UserRole | undefined,
  pathname: string,
  tab: string | null,
): { section?: string; item?: NavItem } {
  for (const section of getNavSections(role)) {
    for (const item of section.items) {
      if (isNavItemActive(item.href, pathname, tab, item)) return { section: section.title, item };
    }
  }
  return {};
}
