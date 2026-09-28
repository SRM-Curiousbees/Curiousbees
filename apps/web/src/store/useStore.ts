import { create } from 'zustand';
import { User, Thread, Comment, Opportunity, UserRole, Event, CollaborationRequest, Workspace, WorkspaceFile, WorkspaceMilestone, WorkspaceAnnouncement, AuditLog, Publication, Report, Department, Notification, ResearchCollaboration, CollaborationMessage, ResearchCollabRequest, CollaborationStatusResponse, IntegrationConnection, ResearchMeeting, IntegrationProvider, MeetingProvider } from '@curiousbees/types';
import { supabase } from '@/lib/supabase/client';
import { getDashboardRoute } from '@/lib/auth/route-protection';
import { ROLE_COOKIE_NAME } from '@curiousbees/constants';
import { apiFetch, getAuthHeaders, readApiError, API_URL, resetAuthPromise } from '@/lib/api-client';

const MOCK_INTERESTS = [
  'Generative AI & LLMs',
  'Quantum Computing',
  'Silicon Photonics',
  'Nanomaterials & Thin Films',
  'Cancer Immunotherapy',
  '5G/6G Wireless Networks',
  'VLSI System Design',
  'Bioinformatics'
];

function deriveNotificationType(title: string = ''): any {
  const t = title.toLowerCase();
  if (t.includes('paper') || t.includes('publication') || t.includes('journal')) return 'RESEARCH_PAPER';
  if (t.includes('grant') || t.includes('opportunity') || t.includes('phd position') || t.includes('funding')) return 'OPPORTUNITY';
  if (t.includes('collab') || t.includes('invitation') || t.includes('peer')) return 'COLLABORATION';
  if (t.includes('supervisor') || t.includes('scholar') || t.includes('advisory') || t.includes('milestone')) return 'ADVISORY';
  if (t.includes('event') || t.includes('conference') || t.includes('seminar')) return 'EVENT';
  return 'SYSTEM';
}

function deriveNotificationHref(type?: string, title: string = ''): string {
  if (type === 'RESEARCH_PAPER') return '/feed?type=PUBLICATION';
  if (type === 'OPPORTUNITY') return '/opportunities';
  if (type === 'COLLABORATION') return '/feed?type=COLLABORATION_REQUEST';
  if (type === 'ADVISORY' || type === 'SUPERVISION') return '/scholar/my-research';
  if (type === 'EVENT') return '/events';
  return '/notifications';
}

interface AppState {
  // Session & Profiles
  currentUser: User | null;
  roleOverride: UserRole; // Syncs to current user role
  dashboardRoute: string; // Role-based landing route
  interestsList: string[];
  notProvisioned: boolean;
  isSuspended: boolean;

  // UI states
  isLoading: boolean;
  showMobileSidebar: boolean;
  searchQuery: string;
  activeTag: string;
  theme: 'dark' | 'light';

  // Domain states
  threads: Thread[];
  feedCounts: Record<string, number>;
  feedError: string | null;
  opportunities: Opportunity[];
  events: Event[];

  pendingApprovals: User[];
  pendingSupervisors: User[];
  collaborationRequests: CollaborationRequest[];
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  adminUsers: User[];
  adminAuditLogs: AuditLog[];
  collaborators: User[];

  // New Controlled Research Collaboration State
  collabStatuses: Record<string, CollaborationStatusResponse>;
  myCollaborations: ResearchCollaboration[];
  activeCollabMessages: CollaborationMessage[];
  myCollabRequests: { sent: ResearchCollabRequest[]; received: ResearchCollabRequest[] };

  // My Research Module State & Actions
  myResearchProfile: any | null;
  myResearchMilestones: any[];
  myResearchActivities: any[];
  myResearchMaterials: any[];

  fetchMyResearch: () => Promise<any>;
  updateResearchProfile: (data: any) => Promise<any>;
  fetchMyResearchMilestones: () => Promise<any[]>;
  createResearchMilestone: (data: any) => Promise<any>;
  updateMilestone: (id: string, data: any) => Promise<any>;
  completeMilestone: (id: string) => Promise<any>;
  fetchMyResearchActivity: () => Promise<any[]>;
  fetchMyResearchMaterials: () => Promise<any[]>;

  // External Links Actions
  fetchUserExternalLinks: (userId: string) => Promise<any[]>;
  addExternalLink: (userId: string, data: { platform: string; label?: string; url: string }) => Promise<any>;
  updateExternalLink: (userId: string, linkId: string, data: { label?: string; url?: string; isVisible?: boolean }) => Promise<any>;
  deleteExternalLink: (userId: string, linkId: string) => Promise<void>;

  publications: Publication[];
  reports: Report[];
  departments: Department[];
  supervisors: User[];
  myScholars: User[];
  notifications: Notification[];
  unreadCount: number;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];

  // Follow System State
  followedUserIds: Record<string, boolean>;
  followedDomains: Record<string, boolean>;
  followedTopics: Record<string, boolean>;

  fetchFollowState: () => Promise<void>;
  toggleFollowUser: (targetId: string) => Promise<boolean>;
  toggleFollowDomain: (domain: string) => Promise<boolean>;
  toggleFollowTopic: (topic: string) => Promise<boolean>;

  // Setters & Actions
  setCurrentUser: (user: User | null) => void;
  setDashboardRoute: (route: string) => void;
  setMobileSidebar: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveTag: (tag: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // Live REST API Actions (Integrates Supabase Bearer JWT)
  syncUserSession: (options?: { throwOnError?: boolean; force?: boolean }) => Promise<User | null>;
  fetchData: (skipThreads?: boolean) => Promise<void>;
  fetchFeedThreads: (search?: string, type?: string, sort?: 'latest' | 'top') => Promise<void>;
  fetchFeedCounts: (search?: string) => Promise<void>;
  fetchCollaborators: (search?: string, department?: string) => Promise<User[]>;
  createThread: (title: string, content: string, tags: string[], options?: { type?: any; isPaper?: boolean; paperJournal?: string | null; attachments?: any[] }) => Promise<Thread>;
  addComment: (threadId: string, content: string, parentId?: string) => Promise<Comment>;
  updateComment: (commentId: string, content: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleCommentLike: (commentId: string) => Promise<{ liked: boolean }>;
  toggleLikeThread: (threadId: string) => Promise<{ liked: boolean }>;
  toggleSaveThread: (threadId: string) => Promise<{ saved: boolean }>;
  shareThread: (threadId: string, platform?: string) => Promise<void>;
  reportThread: (threadId: string, reason: string, description?: string) => Promise<void>;
  requestThreadCollaboration: (threadId: string, message?: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  updateThread: (threadId: string, data: Partial<{ title: string; content: string; tags: string[]; type: any; isPaper: boolean }>) => Promise<Thread>;
  getSavedThreads: () => Promise<Thread[]>;
  deleteThreadLocally: (threadId: string) => void;
  updateThreadLocally: (threadId: string, data: Thread) => void;
  toggleSaveThreadLocally: (threadId: string, saved: boolean, userId: string) => void;
  
  fetchTrendingResearch: () => Promise<Array<{tag: string, count: number}>>;
  fetchSuggestedPeers: () => Promise<any[]>;
  connectWithPeer: (peerId: string) => Promise<'connect' | 'pending' | 'connected' | null>;
  searchFeed: (query: string) => Promise<{ threads: Thread[], publications: Publication[], users: User[] }>;
  fetchOpportunities: () => Promise<Opportunity[]>;
  createOpportunity: (titleOrPayload: string | any, description?: string, department?: string, researchDomain?: string, extraData?: any) => Promise<Opportunity>;
  fetchProfile: () => Promise<any>;
  updateProfile: (data: { name?: string; department?: string; departmentId?: string; bio?: string; role?: UserRole; interests?: string[] }) => Promise<User>;
  fetchEvents: (showIndicator?: boolean) => Promise<Event[]>;

  createEvent: (title: string, date: string, time: string, venue: string, description?: string, eventType?: string, registrationLink?: string) => Promise<Event>;
  updateEvent: (id: string, title: string, date: string, time: string, venue: string, description?: string, eventType?: string, registrationLink?: string) => Promise<Event>;
  deleteEvent: (id: string) => Promise<Event>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<void>;
  signInWithOtp: (email: string, redirectTo?: string) => Promise<void>;
  logout: () => void;

  // Supervisor Approvals & Requests
  fetchPendingApprovals: () => Promise<User[]>;
  approveScholar: (id: string) => Promise<any>;
  declineScholar: (id: string) => Promise<any>;
  reassignScholar: (scholarId: string, newSupervisorId: string, notes?: string) => Promise<any>;
  requestSupervisor: (supervisorId: string, message?: string, context?: { researchDomain?: string; researchTopic?: string; proposalTitle?: string }) => Promise<any>;

  // Admin Supervisor Approvals
  fetchPendingSupervisors: () => Promise<User[]>;
  approveSupervisor: (supervisorId: string) => Promise<User>;
  declineSupervisor: (supervisorId: string) => Promise<User>;

  // Collaboration Requests
  fetchCollaborationRequests: () => Promise<CollaborationRequest[]>;
  createCollaborationRequest: (opportunityId: string, message?: string) => Promise<CollaborationRequest>;
  updateCollaborationRequest: (requestId: string, status: 'PUBLISHED' | 'REJECTED' | 'NEEDS_INFO') => Promise<CollaborationRequest>;

  // Workspaces
  fetchWorkspaces: () => Promise<Workspace[]>;
  createWorkspace: (data: {
    title: string;
    description?: string;
    researchDomain?: string;
    researchDomainId?: string;
    researchTopic?: string;
    researchTopicId?: string;
    scholarIds?: string[];
  }) => Promise<Workspace>;
  fetchWorkspaceDetails: (workspaceId: string) => Promise<Workspace>;
  addWorkspaceFile: (workspaceId: string, name: string, url: string, size: number) => Promise<WorkspaceFile>;
  uploadResearchFileToS3: (file: File, prefix?: string) => Promise<{ fileUrl: string; objectKey: string; name: string; size: number }>;
  addWorkspaceMilestone: (workspaceId: string, title: string, description?: string, dueDate?: string) => Promise<WorkspaceMilestone>;
  toggleWorkspaceMilestone: (workspaceId: string, milestoneId: string, completed: boolean) => Promise<WorkspaceMilestone>;
  addWorkspaceAnnouncement: (workspaceId: string, title: string, content: string) => Promise<WorkspaceAnnouncement>;

  // Controlled Research Collaborations
  fetchCollabStatus: (targetUserId: string, threadId?: string) => Promise<CollaborationStatusResponse>;
  sendCollabRequest: (recipientId: string, threadId?: string, message?: string) => Promise<ResearchCollabRequest>;
  cancelCollabRequest: (requestId: string) => Promise<ResearchCollabRequest>;
  acceptCollabRequest: (requestId: string, provider?: IntegrationProvider) => Promise<ResearchCollaboration>;
  declineCollabRequest: (requestId: string) => Promise<ResearchCollabRequest>;
  fetchMyCollaborations: () => Promise<ResearchCollaboration[]>;
  fetchMyCollabRequests: () => Promise<{ sent: ResearchCollabRequest[]; received: ResearchCollabRequest[] }>;
  fetchCollabMessages: (collabId: string, page?: number) => Promise<CollaborationMessage[]>;
  sendCollabMessage: (collabId: string, content: string) => Promise<CollaborationMessage>;

  // External Integrations & Meetings
  integrationConnections: { google: IntegrationConnection; zoom: IntegrationConnection } | null;
  workspaceMeetings: Record<string, ResearchMeeting[]>;
  fetchIntegrationStatus: () => Promise<{ google: IntegrationConnection; zoom: IntegrationConnection }>;
  getGoogleAuthUrl: (redirectUri: string) => Promise<{ authUrl: string }>;
  handleGoogleCallback: (code: string, redirectUri: string) => Promise<any>;
  getZoomAuthUrl: (redirectUri: string) => Promise<{ authUrl: string }>;
  handleZoomCallback: (code: string, redirectUri: string) => Promise<any>;
  disconnectIntegration: (provider: IntegrationProvider) => Promise<any>;
  fetchWorkspaceMeetings: (workspaceId: string) => Promise<ResearchMeeting[]>;
  createWorkspaceMeeting: (workspaceId: string, dto: { title: string; description?: string; provider: MeetingProvider; scheduledAt: string | Date; duration?: number; externalMeetingUrl?: string }) => Promise<ResearchMeeting>;
  cancelWorkspaceMeeting: (workspaceId: string, meetingId: string) => Promise<ResearchMeeting>;
  setWorkspaceCollaborationProvider: (workspaceId: string, provider: IntegrationProvider, externalMeetingUrl?: string) => Promise<Workspace>;
  connectWorkspaceChatSpace: (workspaceId: string) => Promise<{ success: boolean; googleChatSpaceId?: string; googleChatSpaceUrl?: string }>;


  // Admin / Governance
  fetchAdminUsers: () => Promise<User[]>;
  fetchAdminAuditLogs: () => Promise<AuditLog[]>;
  changeUserRole: (userId: string, role: UserRole, reason?: string) => Promise<User>;

  // Admin User CRUD & Import Actions
  createAdminUser: (data: { name: string; email: string; role: UserRole; departmentId?: string; supervisorId?: string }) => Promise<User>;
  updateAdminUser: (id: string, data: { name?: string; email?: string; role?: UserRole; status?: string; departmentId?: string; supervisorId?: string }) => Promise<User>;
  deleteAdminUser: (id: string, reason?: string) => Promise<void>;
  updateAdminUserAffiliation: (userId: string, data: { facultyId: string; departmentId: string; reason?: string }) => Promise<any>;
  importAdminUsers: (formData: FormData) => Promise<any>;

  // Comprehensive Governance Actions
  fetchAdminDashboardStats: () => Promise<any>;
  fetchAdminNeedsAttention: () => Promise<any[]>;
  fetchAdminUsersPaginated: (query?: any) => Promise<{ items: any[]; pagination: any }>;
  fetchAdminUserGovernanceProfile: (id: string) => Promise<any>;
  suspendUser: (userId: string, reason: string) => Promise<any>;
  reactivateUser: (userId: string, reason: string) => Promise<any>;
  deactivateUser: (userId: string, reason: string) => Promise<any>;
  reassignSupervisor: (scholarId: string, supervisorId: string, reason: string) => Promise<any>;
  fetchAdminModerationReports: (query?: any) => Promise<{ items: any[]; pagination: any }>;
  resolveModerationReport: (id: string, resolutionNote: string) => Promise<any>;
  dismissModerationReport: (id: string, reason: string) => Promise<any>;
  fetchAdminPosts: (query?: any) => Promise<{ items: any[]; pagination: any }>;
  hideAdminPost: (id: string, reason: string) => Promise<any>;
  restoreAdminPost: (id: string, reason?: string) => Promise<any>;
  deleteAdminPost: (id: string, reason: string) => Promise<any>;
  fetchAdminPublicationsList: (query?: any) => Promise<{ items: any[]; pagination: any }>;
  hideAdminPublication: (id: string, reason: string) => Promise<any>;
  restoreAdminPublication: (id: string, reason?: string) => Promise<any>;
  fetchAdminFaculties: () => Promise<any[]>;
  createAdminFaculty: (name: string) => Promise<any>;
  updateAdminFaculty: (id: string, name: string) => Promise<any>;
  deleteAdminFaculty: (id: string) => Promise<any>;
  fetchAdminDepartments: () => Promise<any[]>;
  createAdminDepartment: (data: any) => Promise<any>;
  updateAdminDepartment: (id: string, data: any) => Promise<any>;
  deleteAdminDepartment: (id: string) => Promise<any>;
  fetchAdminCampuses: () => Promise<any[]>;
  createAdminCampus: (data: any) => Promise<any>;
  updateAdminCampus: (id: string, data: any) => Promise<any>;
  fetchAdminAuditLogsPaginated: (query?: any) => Promise<{ items: any[]; pagination: any }>;
  fetchAdminSecurityEvents: (query?: any) => Promise<{ items: any[]; pagination: any }>;
  fetchAdminAnalytics: (range?: string) => Promise<any>;
  fetchAdminRolesMatrix: () => Promise<any>;
  fetchAdminSettings: () => Promise<any>;
  updateAdminSetting: (key: string, value: any, category?: string) => Promise<any>;
  fetchAdminEmailStats: () => Promise<any>;
  fetchAdminResearchGovernance: () => Promise<any>;
  fetchAdminWorkspaces: (query?: any) => Promise<{ items: any[]; pagination: any }>;

  // Supervisor Actions (New flow)
  fetchPendingScholars: () => Promise<User[]>;
  supervisorApproveScholar: (scholarId: string) => Promise<User>;
  supervisorRejectScholar: (scholarId: string) => Promise<User>;

  // Publications
  fetchPublications: (userId?: string) => Promise<Publication[]>;
  createPublication: (data: { title: string; authors: string; doi?: string; publisher?: string; year: number; status: string }) => Promise<Publication>;
  updatePublication: (id: string, data: { title?: string; authors?: string; doi?: string; publisher?: string; year?: number; status?: string }) => Promise<Publication>;
  deletePublication: (id: string) => Promise<void>;

  // Reports
  fetchReports: () => Promise<Report[]>;
  submitReport: (data: { title: string; description?: string; evidenceUrl?: string; supervisorId: string }) => Promise<Report>;
  reviewReport: (id: string, status: string, feedback?: string) => Promise<Report>;

  // Notifications
  fetchNotifications: () => Promise<Notification[]>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  addNotification: (data: Partial<Notification>) => void;

  // Departments
  fetchDepartments: () => Promise<Department[]>;
  createDepartment: (data: { name: string; code: string; facultyId: string; description?: string }) => Promise<Department>;
  updateDepartment: (id: string, data: { name?: string; code?: string; facultyId?: string; description?: string }) => Promise<Department>;
  deleteDepartment: (id: string) => Promise<void>;

  // Role details / Supervisors / Scholars
  fetchSupervisors: () => Promise<User[]>;
  fetchMyScholars: () => Promise<User[]>;
  suspendUserToggle: (userId: string, suspended: boolean) => Promise<User>;

  // Toasts
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

// Auth header helper — delegates to centralized api-client
const getBearerHeader = getAuthHeaders;

// ─── Cookie helpers (client-side only) ──────────────────────────────────────
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

let activeSyncPromise: Promise<User | null> | null = null;

export const useStore = create<AppState>((set, get) => ({
  currentUser: null, // Default to null for strict live login checking
  roleOverride: 'RESEARCH_SCHOLAR',
  dashboardRoute: '/feed',
  interestsList: MOCK_INTERESTS,
  notProvisioned: false,
  isSuspended: false,

  isLoading: false,
  showMobileSidebar: false,
  searchQuery: '',
  activeTag: '',
  theme: 'light',

  threads: [],
  feedCounts: { ALL: 0 },
  feedError: null,
  opportunities: [],
  events: [],
  publications: [],

  collaborators: [],
  pendingApprovals: [],
  pendingSupervisors: [],
  collaborationRequests: [],
  workspaces: [],
  activeWorkspace: null,
  adminUsers: [],
  adminAuditLogs: [],
  
  collabStatuses: {},
  myCollaborations: [],
  activeCollabMessages: [],
  myCollabRequests: { sent: [], received: [] },
  myResearchProfile: null,
  myResearchMilestones: [],
  myResearchActivities: [],
  myResearchMaterials: [],
  reports: [],
  departments: [],
  supervisors: [],
  myScholars: [],
  notifications: [],
  unreadCount: 0,
  toasts: [],

  followedUserIds: {},
  followedDomains: {},
  followedTopics: {},

  fetchFollowState: async () => {
    try {
      const res = await apiFetch('/api/users/me/follow-state');
      if (res.ok) {
        const data = await res.json();
        const userMap: Record<string, boolean> = {};
        const domainMap: Record<string, boolean> = {};
        const topicMap: Record<string, boolean> = {};

        (data.followedUserIds || []).forEach((id: string) => { userMap[id] = true; });
        (data.followedDomains || []).forEach((d: string) => { domainMap[d.toLowerCase()] = true; });
        (data.followedTopics || []).forEach((t: string) => { topicMap[t.toLowerCase().replace(/^#/, '')] = true; });

        set({
          followedUserIds: userMap,
          followedDomains: domainMap,
          followedTopics: topicMap
        });
      }
    } catch (e) {
      console.error('Failed to fetch follow state:', e);
    }
  },

  toggleFollowUser: async (targetId: string) => {
    const isFollowing = !!get().followedUserIds[targetId];
    const nextState = !isFollowing;

    // Optimistic update
    set(state => ({
      followedUserIds: {
        ...state.followedUserIds,
        [targetId]: nextState
      }
    }));

    try {
      const method = nextState ? 'POST' : 'DELETE';
      const res = await apiFetch(`/api/users/${targetId}/follow`, { method });
      if (!res.ok) throw new Error('Follow action failed');
      get().addToast(nextState ? 'Following researcher' : 'Unfollowed researcher', 'success');
      return nextState;
    } catch (e) {
      // Revert on failure
      set(state => ({
        followedUserIds: {
          ...state.followedUserIds,
          [targetId]: isFollowing
        }
      }));
      get().addToast('Failed to update follow status', 'error');
      return isFollowing;
    }
  },

  toggleFollowDomain: async (domain: string) => {
    const key = domain.trim().toLowerCase();
    const isFollowing = !!get().followedDomains[key];
    const nextState = !isFollowing;

    // Optimistic update
    set(state => ({
      followedDomains: {
        ...state.followedDomains,
        [key]: nextState
      }
    }));

    try {
      const method = nextState ? 'POST' : 'DELETE';
      const res = await apiFetch('/api/users/follow-domain', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      if (!res.ok) throw new Error('Domain follow failed');
      get().addToast(nextState ? `Following domain: ${domain}` : `Unfollowed domain: ${domain}`, 'success');
      return nextState;
    } catch (e) {
      set(state => ({
        followedDomains: {
          ...state.followedDomains,
          [key]: isFollowing
        }
      }));
      get().addToast('Failed to update domain follow status', 'error');
      return isFollowing;
    }
  },

  toggleFollowTopic: async (topic: string) => {
    const key = topic.trim().toLowerCase().replace(/^#/, '');
    const isFollowing = !!get().followedTopics[key];
    const nextState = !isFollowing;

    // Optimistic update
    set(state => ({
      followedTopics: {
        ...state.followedTopics,
        [key]: nextState
      }
    }));

    try {
      const method = nextState ? 'POST' : 'DELETE';
      const res = await apiFetch('/api/users/follow-topic', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: key })
      });
      if (!res.ok) throw new Error('Topic follow failed');
      get().addToast(nextState ? `Following #${key}` : `Unfollowed #${key}`, 'success');
      return nextState;
    } catch (e) {
      set(state => ({
        followedTopics: {
          ...state.followedTopics,
          [key]: isFollowing
        }
      }));
      get().addToast('Failed to update topic follow status', 'error');
      return isFollowing;
    }
  },

  setCurrentUser: (user) => {
    if (user) {
      const route = getDashboardRoute(user);
      setCookie(ROLE_COOKIE_NAME, user.role);
      set({ currentUser: user, roleOverride: user.role, dashboardRoute: route, notProvisioned: false, isSuspended: false });
    } else {
      deleteCookie(ROLE_COOKIE_NAME);
      set({ currentUser: null, roleOverride: 'RESEARCH_SCHOLAR', dashboardRoute: '/feed', notProvisioned: false, isSuspended: false });
    }
  },
  setDashboardRoute: (route) => set({ dashboardRoute: route }),
  setMobileSidebar: (show) => set({ showMobileSidebar: show }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTag: (tag) => set({ activeTag: tag }),

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
      localStorage.setItem('curiousbees-theme', theme);
    }
    set({ theme });
  },

  syncUserSession: async (options) => {
    console.info('[AuthStore] syncUserSession called with options:', options);

    // 1. Check if currentUser is already cached in Zustand (and bypass if force is true)
    if (!options?.force) {
      const cachedUser = get().currentUser;
      if (cachedUser) {
        console.info('[AuthStore] Returning cached user from Zustand:', cachedUser.email);
        return cachedUser;
      }
    }

    // 2. Check if a synchronization is already in progress
    if (activeSyncPromise) {
      console.info('[AuthStore] Reusing in-flight syncUserSession promise.');
      return activeSyncPromise;
    }

    // 3. Initiate synchronization and cache the promise
    activeSyncPromise = (async () => {
      set({ isLoading: true });
      try {
        console.info('[AuthStore] Starting auth headers check...');
        const headers = await getBearerHeader();
        if (Object.keys(headers).length === 0) {
          console.warn('[AuthStore] No auth headers returned, clearing session.');
          deleteCookie(ROLE_COOKIE_NAME);
          set({ currentUser: null });
          if (options?.throwOnError) {
            throw new Error('No Auth ID token is available. Complete sign-in before syncing with the backend.');
          }
          return null;
        }

        console.info('[AuthStore] Sending backend session sync request...');
        const res = await apiFetch('/api/auth/me');

        console.info('[AuthStore] Backend session sync response:', {
          status: res.status,
          ok: res.ok,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.access === false) {
            if (data.reason === 'USER_NOT_PROVISIONED') {
              console.warn('[AuthStore] User not provisioned, setting notProvisioned flag.');
              deleteCookie(ROLE_COOKIE_NAME);
              set({ currentUser: null, notProvisioned: true });
              return null;
            }
            if (data.reason === 'USER_SUSPENDED') {
              console.warn('[AuthStore] User suspended, setting isSuspended flag.');
              deleteCookie(ROLE_COOKIE_NAME);
              set({ currentUser: null, isSuspended: true });
              return null;
            }
          }
          if (data.success && data.user) {
            const user: User = data.user;
            console.info('[AuthStore] Session sync success:', {
              id: user.id,
              email: user.email,
              role: user.role,
              approved: user.approved,
            });
            const route = getDashboardRoute(user);
            setCookie(ROLE_COOKIE_NAME, user.role);
            set({ currentUser: user, roleOverride: user.role, dashboardRoute: route, notProvisioned: false, isSuspended: false });
            return user;
          }
          const errorMessage = 'Backend auth sync returned HTTP 200 without a user payload.';
          console.error('[AuthStore] Error:', errorMessage);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('curiousbees-mock-token');
          }
          deleteCookie(ROLE_COOKIE_NAME);
          set({ currentUser: null });
          if (options?.throwOnError) {
            throw new Error(errorMessage);
          }
          return null;
        }

        const apiMessage = await readApiError(res);
        const errorMessage = apiMessage
          ? `Backend auth sync failed (${res.status}): ${apiMessage}`
          : `Backend auth sync failed with HTTP ${res.status}.`;
        console.error('[AuthStore] Error:', errorMessage);

        if (typeof window !== 'undefined') {
          localStorage.removeItem('curiousbees-mock-token');
        }
        deleteCookie(ROLE_COOKIE_NAME);
        set({ currentUser: null });
        if (options?.throwOnError) {
          throw new Error(errorMessage);
        }
        return null;
      } catch (e: any) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('curiousbees-mock-token');
        }
        deleteCookie(ROLE_COOKIE_NAME);
        set({ currentUser: null });
        console.error('[AuthStore] Exception during session sync:', e);
        if (options?.throwOnError) {
          throw e;
        }
        return null;
      } finally {
        set({ isLoading: false });
        activeSyncPromise = null; // Clear promise cache when done
        console.info('[AuthStore] syncUserSession complete, cleared promise cache.');
      }
    })();

    return activeSyncPromise;
  },

  // 2. Fetch live Threads, Opportunities, and Events concurrently
  fetchData: async (skipThreads?: boolean) => {
    set({ isLoading: true });
    try {
      const oppsPromise = apiFetch('/api/opportunities');
      const eventsPromise = apiFetch('/api/events');
      const threadsPromise = !skipThreads ? apiFetch('/api/threads') : Promise.resolve(null);

      const [oppsSettled, eventsSettled, threadsSettled] = await Promise.allSettled([
        oppsPromise,
        eventsPromise,
        threadsPromise
      ]);

      if (oppsSettled.status === 'fulfilled' && oppsSettled.value && oppsSettled.value.ok) {
        const data = await oppsSettled.value.json();
        set({ opportunities: Array.isArray(data) ? data : [] });
      }

      if (eventsSettled.status === 'fulfilled' && eventsSettled.value && eventsSettled.value.ok) {
        const data = await eventsSettled.value.json();
        set({ events: Array.isArray(data) ? data : [] });
      }

      if (threadsSettled.status === 'fulfilled' && threadsSettled.value && threadsSettled.value.ok) {
        const data = await threadsSettled.value.json();
        set({ threads: Array.isArray(data) ? data : [] });
      }

      // Fetch notifications & follow state concurrently
      get().fetchNotifications().catch(() => {});
      get().fetchFollowState().catch(() => {});
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFeedThreads: async (search?: string, type?: string, sort?: 'latest' | 'top') => {
    set({ isLoading: true, feedError: null });
    try {
      if (type === 'SAVED') {
        const res = await apiFetch('/api/threads/saved');
        if (res.ok) {
          const threads = await res.json();
          set({ threads, feedError: null });
        } else {
          const err = await readApiError(res);
          set({ feedError: err || 'Unable to load saved posts' });
        }
        return;
      }

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (type && type !== 'ALL') params.append('type', type);
      if (sort) params.append('sort', sort);
      const res = await apiFetch(`/api/threads?${params.toString()}`);
      if (res.ok) {
        const threads = await res.json();
        set({ threads, feedError: null });
      } else {
        const err = await readApiError(res);
        set({ feedError: err || 'Something went wrong while retrieving research activity.' });
      }
    } catch (e: any) {
      console.error('Failed to load feed threads:', e);
      set({ feedError: 'Unable to load the research feed' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFeedCounts: async (search?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await apiFetch(`/api/threads/counts?${params.toString()}`);
      if (res.ok) {
        const feedCounts = await res.json();
        set({ feedCounts });
      }
    } catch (e) {
      console.error('Failed to load feed counts:', e);
    }
  },

  // 3. Query directory of co-authors / research experts from database
  fetchCollaborators: async (search, department) => {
    try {
      let query = '';
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (department) query += `department=${encodeURIComponent(department)}`;

      const res = await apiFetch(`/api/users/collaborators?${query}`);
      if (res.ok) {
        const data = await res.json();
        set({ collaborators: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error('Failed to query expert directory:', e);
      return [];
    }
  },

  // 4. Create a new discussion thread
  createThread: async (title, content, tags, options) => {
    set({ isLoading: true });
    try {
      const payload = { title, content, tags, ...options };
      const res = await apiFetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newThread = await res.json();
        set((state) => ({
          threads: [newThread, ...state.threads]
        }));
        return newThread;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to publish thread.');
    } finally {
      set({ isLoading: false });
    }
  },

  addComment: async (threadId, content, parentId) => {
    set({ isLoading: true });
    try {
      const payload = { threadId, content, parentId };
      const res = await apiFetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newComment = await res.json();
        set(state => ({
          threads: state.threads.map(t => {
            if (t.id === threadId) {
              return {
                ...t,
                comments: [...(t.comments || []), newComment]
              };
            }
            return t;
          })
        }));
        return newComment;
      }
      throw new Error('Failed to publish comment.');
    } finally {
      set({ isLoading: false });
    }
  },

  updateComment: async (commentId, content) => {
    const res = await apiFetch(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const updatedComment = await res.json();
      set(state => {
        const updater = (c: any) => c.id === commentId ? { ...c, content: updatedComment.content } : c;
        const traverse = (comments: any[]): any[] => comments.map(c => ({ ...updater(c), replies: c.replies ? traverse(c.replies) : [] }));
        return {
          threads: state.threads.map(t => ({
            ...t,
            comments: t.comments ? traverse(t.comments) : []
          }))
        };
      });
      return updatedComment;
    }
    throw new Error('Failed to update comment.');
  },

  deleteComment: async (commentId) => {
    const res = await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) {
      set(state => {
        const traverse = (comments: any[]): any[] => comments.filter(c => c.id !== commentId).map(c => ({ ...c, replies: c.replies ? traverse(c.replies) : [] }));
        return {
          threads: state.threads.map(t => ({
            ...t,
            comments: t.comments ? traverse(t.comments) : []
          }))
        };
      });
    } else {
      throw new Error('Failed to delete comment.');
    }
  },

  toggleCommentLike: async (commentId) => {
    let resultLiked = false;
    set(state => {
      const traverse = (comments: any[]): any[] => comments.map(c => {
        if (c.id === commentId) {
          const currentLiked = c.likes && c.likes.length > 0;
          const newCount = currentLiked ? Math.max(0, (c._count?.likes || 0) - 1) : (c._count?.likes || 0) + 1;
          resultLiked = !currentLiked;
          return {
            ...c,
            _count: { ...c._count, likes: newCount },
            likes: resultLiked ? [{ userId: state.currentUser?.id }] : []
          };
        }
        return { ...c, replies: c.replies ? traverse(c.replies) : [] };
      });
      return {
        threads: state.threads.map(t => ({
          ...t,
          comments: t.comments ? traverse(t.comments) : []
        }))
      };
    });

    const res = await apiFetch(`/api/comments/${commentId}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      set(state => {
        const traverse = (comments: any[]): any[] => comments.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              _count: { ...c._count, likes: data.likeCount }
            };
          }
          return { ...c, replies: c.replies ? traverse(c.replies) : [] };
        });
        return {
          threads: state.threads.map(t => ({
            ...t,
            comments: t.comments ? traverse(t.comments) : []
          }))
        };
      });
      return data;
    }
    throw new Error('Failed to toggle comment like');
  },

  toggleLikeThread: async (threadId) => {
    // Optimistic update
    set(state => {
      const updatedThreads = state.threads.map(t => {
        if (t.id === threadId) {
          const currentLiked = t.likes && t.likes.length > 0;
          const newLiked = !currentLiked;
          const currentCount = t._count?.likes || 0;
          const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
          
          return {
            ...t,
            likes: newLiked ? [{ id: `like-${threadId}`, threadId, userId: state.currentUser?.id || '', createdAt: new Date().toISOString() }] : [],
            _count: { ...t._count, likes: newCount }
          };
        }
        return t;
      });
      return { threads: updatedThreads };
    });

    const res = await apiFetch(`/api/threads/${threadId}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      set(state => ({
        threads: state.threads.map(t => 
          t.id === threadId 
            ? { 
                ...t, 
                likes: data.liked ? [{ id: `like-${threadId}`, threadId, userId: state.currentUser?.id || '', createdAt: new Date().toISOString() }] : [],
                _count: { ...t._count, likes: data.likeCount } 
              }
            : t
        )
      }));
      return data;
    }
    throw new Error('Failed to like thread');
  },

  toggleSaveThread: async (threadId) => {
    const res = await apiFetch(`/api/threads/${threadId}/save`, { method: 'POST' });
    if (res.ok) return await res.json();
    throw new Error('Failed to save thread');
  },

  shareThread: async (threadId, platform) => {
    const res = await apiFetch(`/api/threads/${threadId}/share`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform })
    });
    if (!res.ok) throw new Error('Failed to share thread');
  },

  reportThread: async (threadId, reason, description) => {
    const res = await apiFetch(`/api/threads/${threadId}/report`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, description })
    });
    if (!res.ok) throw new Error('Failed to report thread');
  },

  requestThreadCollaboration: async (threadId, message) => {
    const res = await apiFetch(`/api/threads/${threadId}/collaborate`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error('Failed to request collaboration');
  },

  deleteThread: async (threadId) => {
    const res = await apiFetch(`/api/threads/${threadId}`, { method: 'DELETE' });
    if (res.ok) {
      set(state => ({ threads: state.threads.filter(t => t.id !== threadId) }));
    } else {
      throw new Error('Failed to delete thread');
    }
  },

  updateThread: async (threadId, data) => {
    const res = await apiFetch(`/api/threads/${threadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const updatedThread = await res.json();
      set(state => ({
        threads: state.threads.map(t => t.id === threadId ? updatedThread : t)
      }));
      return updatedThread;
    }
    throw new Error('Failed to update thread');
  },

  getSavedThreads: async () => {
    const res = await apiFetch('/api/threads/saved');
    if (res.ok) return await res.json();
    return [];
  },

  deleteThreadLocally: (threadId: string) => {
    set(state => ({ threads: state.threads.filter(t => t.id !== threadId) }));
  },

  updateThreadLocally: (threadId: string, data: Thread) => {
    set(state => ({ threads: state.threads.map(t => t.id === threadId ? data : t) }));
  },

  toggleSaveThreadLocally: (threadId: string, saved: boolean, userId: string) => {
    set(state => {
      const updatedThreads = state.threads.map(t => {
        if (t.id === threadId) {
          const newSaves = saved ? [{ userId, threadId, id: 'temp', createdAt: new Date() }] : [];
          return { ...t, saves: newSaves as any };
        }
        return t;
      });

      const newFeedCounts = state.feedCounts ? { ...state.feedCounts } : {};
      if (saved) {
        newFeedCounts.SAVED = (newFeedCounts.SAVED || 0) + 1;
        newFeedCounts.saved = newFeedCounts.SAVED;
      } else {
        newFeedCounts.SAVED = Math.max(0, (newFeedCounts.SAVED || 0) - 1);
        newFeedCounts.saved = newFeedCounts.SAVED;
      }

      return { threads: updatedThreads, feedCounts: newFeedCounts };
    });
  },

  fetchTrendingResearch: async () => {
    const res = await apiFetch('/api/feed/trending');
    if (res.ok) return await res.json();
    return [];
  },

  fetchSuggestedPeers: async () => {
    try {
      const res = await apiFetch('/api/users/collaborators');
      if (res.ok) {
        const data = await res.json();
        return data.map((u: any) => {
          let connected: 'connect' | 'pending' | 'connected' = 'connect';
          if (u.connectionStatus === 'PENDING') connected = 'pending';
          else if (u.connectionStatus === 'CONNECTED') connected = 'connected';
          return {
            id: u.id,
            name: u.name,
            role: u.role,
            department: u.department,
            connected
          };
        });
      }
      return [];
    } catch (e) {
      console.error('Failed to load peers:', e);
      return [];
    }
  },

  connectWithPeer: async (peerId: string) => {
    try {
      const res = await apiFetch(`/api/users/${peerId}/connect`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        return data.status as 'connect' | 'pending' | 'connected';
      }
      get().addToast('Failed to send connection request', 'error');
      return null;
    } catch (err) {
      get().addToast('Network error while connecting', 'error');
      return null;
    }
  },

  searchFeed: async (query) => {
    const res = await apiFetch(`/api/feed/search?q=${encodeURIComponent(query)}`);
    if (res.ok) return await res.json();
    return { threads: [], publications: [], users: [] };
  },

  fetchOpportunities: async () => {
    try {
      const res = await apiFetch('/api/opportunities');
      if (res.ok) {
        const data = await res.json();
        const opps = Array.isArray(data) ? data : [];
        set({ opportunities: opps });
        return opps;
      }
      return [];
    } catch (e) {
      console.error('Failed to fetch opportunities:', e);
      return [];
    }
  },

  // 6. Publish a research opportunity (Hiring/Collaboration)
  createOpportunity: async (titleOrPayload: any, description?: string, department?: string, researchDomain?: string, extraData?: any) => {
    set({ isLoading: true });
    try {
      const payload = typeof titleOrPayload === 'object' 
        ? titleOrPayload 
        : { title: titleOrPayload, description, department, researchDomain, ...extraData };

      const res = await apiFetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newOpp = await res.json();
        set((state) => ({
          opportunities: [newOpp, ...state.opportunities]
        }));
        return newOpp;
      }
      const err = await res.json();
      throw new Error(err.message || 'Failed to create opportunity');
    } catch (e: any) {
      console.error(e);
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    try {
      const res = await apiFetch('/api/users/profile');
      if (res.ok) {
        const user = await res.json();
        set({ currentUser: user });
        return user;
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
    return null;
  },

  // 7. Update logged-in Profile metadata
  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        set({ currentUser: updatedUser, roleOverride: updatedUser.role });
        return updatedUser;
      }
      throw new Error('Failed to update profile.');
    } finally {
      set({ isLoading: false });
    }
  },



  fetchEvents: async (showIndicator = false) => {
    if (showIndicator) set({ isLoading: true });
    try {
      const res = await apiFetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        const eventList = Array.isArray(data) ? data : [];
        set({ events: eventList });
        return eventList;
      }
      throw new Error();
    } catch (e) {
      return get().events || [];
    } finally {
      set({ isLoading: false });
    }
  },



  createEvent: async (title, date, time, venue, description, eventType, registrationLink) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, venue, description, eventType, registrationLink }),
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({ events: [...state.events, data] }));
        return data;
      }
      throw new Error();
    } finally {
      set({ isLoading: false });
    }
  },

  updateEvent: async (id, title, date, time, venue, description, eventType, registrationLink) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, venue, description, eventType, registrationLink }),
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          events: state.events.map(e => e.id === id ? data : e)
        }));
        return data;
      }
      throw new Error();
    } finally {
      set({ isLoading: false });
    }
  },

  deleteEvent: async (id) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/events/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          events: state.events.filter(ev => ev.id !== id)
        }));
        return data;
      }
      throw new Error();
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async (redirectTo?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const targetRedirect = redirectTo || '/feed';
    const callbackUrl = `${origin}/auth/callback?redirectTo=${encodeURIComponent(targetRedirect)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[AuthStore] Supabase Google OAuth error:', error);
      throw error;
    }
  },

  signInWithMagicLink: async (email: string, redirectTo?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const targetRedirect = redirectTo || '/feed';
    const callbackUrl = `${origin}/auth/callback?redirectTo=${encodeURIComponent(targetRedirect)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[AuthStore] Supabase Magic Link error:', error);
      throw error;
    }
  },

  signInWithOtp: async (email: string, redirectTo?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const targetRedirect = redirectTo || '/feed';
    const callbackUrl = `${origin}/auth/callback?redirectTo=${encodeURIComponent(targetRedirect)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[AuthStore] Supabase Magic Link error:', error);
      throw error;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('curiousbees-mock-token');
      localStorage.removeItem('dev_role');
    }
    deleteCookie(ROLE_COOKIE_NAME);
    resetAuthPromise();
    supabase.auth.signOut().catch((err) => console.warn('[AuthStore] signOut error:', err));
    set({ currentUser: null, dashboardRoute: '/feed', roleOverride: 'RESEARCH_SCHOLAR', notProvisioned: false, isSuspended: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  fetchPendingApprovals: async () => {
    try {
      const res = await apiFetch('/api/supervisor-requests');
      if (res.ok) {
        const data = await res.json();
        // Filter to PENDING requests and extract scholar info
        const pendingRequests = data.filter((r: any) => r.status === 'PENDING');
        // Map to User-like objects with _requestId for approve/decline
        const scholars = pendingRequests.map((r: any) => ({
          ...r.scholar,
          _requestId: r.id,
          _requestCreatedAt: r.createdAt,
          _researchDomain: r.researchDomain,
          _researchTopic: r.researchTopic,
          _proposalTitle: r.proposalTitle,
          _requestMessage: r.message,
        }));
        set({ pendingApprovals: scholars });
        return scholars;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  approveScholar: async (scholarId: string) => {
    set({ isLoading: true });
    try {
      const state: any = get();
      const match = state.pendingApprovals.find((s: any) => s._requestId === scholarId || s.id === scholarId);
      const targetRequestId = match?._requestId || scholarId;

      const res = await apiFetch(`/api/supervisor-requests/${targetRequestId}/approve`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updatedRequest = await res.json();
      set(state => ({
        pendingApprovals: state.pendingApprovals.filter((s: any) => (s._requestId || s.id) !== scholarId && s.id !== match?.id),
      }));
      get().addToast('Scholar approved successfully', 'success');
      return updatedRequest;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  declineScholar: async (scholarId: string) => {
    set({ isLoading: true });
    try {
      const state: any = get();
      const match = state.pendingApprovals.find((s: any) => s._requestId === scholarId || s.id === scholarId);
      const targetRequestId = match?._requestId || scholarId;

      const res = await apiFetch(`/api/supervisor-requests/${targetRequestId}/reject`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error(await readApiError(res));
      set(state => ({
        pendingApprovals: state.pendingApprovals.filter((s: any) => (s._requestId || s.id) !== scholarId && s.id !== match?.id)
      }));
      get().addToast('Scholar request declined', 'info');
      const updatedRequest = await res.json();
      return updatedRequest;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  reassignScholar: async (scholarId: string, newSupervisorId: string, notes?: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/supervisor-requests/reassign', {
        method: 'PUT',
        body: JSON.stringify({ scholarId, newSupervisorId, notes }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const result = await res.json();
      set(state => ({
        myScholars: state.myScholars.filter((s: any) => s.id !== scholarId)
      }));
      get().addToast('Scholar reassigned to new supervisor successfully.', 'success');
      get().fetchMyScholars();
      return result;
    } catch (err: any) {
      get().addToast(err.message || 'Failed to reassign scholar.', 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  requestSupervisor: async (supervisorId: string, message?: string, context?: { researchDomain?: string; researchTopic?: string; proposalTitle?: string }) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/supervisor-requests', {
        method: 'POST',
        body: JSON.stringify({ supervisorId, message, ...context }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      // Refresh the current user to reflect PENDING_SUPERVISOR_APPROVAL status
      await get().syncUserSession({ force: true });
      get().addToast('Supervisor request sent successfully.', 'success');
      return get().currentUser as any;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPendingSupervisors: async () => {
    set({ isLoading: true });
    try {
      const headers = await getBearerHeader();
      const res = await apiFetch('/api/users/pending-supervisors', { headers });
      if (!res.ok) throw new Error(await readApiError(res));
      const supervisors = await res.json();
      set({ pendingSupervisors: supervisors });
      return supervisors;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  approveSupervisor: async (supervisorId: string) => {
    set({ isLoading: true });
    try {
      const headers = await getBearerHeader();
      const res = await apiFetch('/api/users/approve-supervisor', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ supervisorId })
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updatedUser = await res.json();
      set(state => ({
        pendingSupervisors: state.pendingSupervisors.filter(s => s.id !== supervisorId),
        adminUsers: [...state.adminUsers.filter(u => u.id !== supervisorId), updatedUser]
      }));
      get().addToast('Supervisor approved successfully', 'success');
      return updatedUser;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  declineSupervisor: async (supervisorId: string) => {
    set({ isLoading: true });
    try {
      const headers = await getBearerHeader();
      const res = await apiFetch('/api/users/decline-supervisor', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ supervisorId })
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const rejectedUser = await res.json();
      set(state => ({
        pendingSupervisors: state.pendingSupervisors.filter(s => s.id !== supervisorId),
        adminUsers: state.adminUsers.filter(u => u.id !== supervisorId)
      }));
      get().addToast('Supervisor registration declined', 'info');
      return rejectedUser;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCollaborationRequests: async () => {
    try {
      const res = await apiFetch('/api/opportunities/requests');
      if (res.ok) {
        const data = await res.json();
        set({ collaborationRequests: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createCollaborationRequest: async (opportunityId: string, message?: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/opportunities/${opportunityId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          collaborationRequests: [data, ...state.collaborationRequests]
        }));
        return data;
      }
      throw new Error('Failed to submit collaboration request.');
    } finally {
      set({ isLoading: false });
    }
  },

  updateCollaborationRequest: async (requestId: string, status: 'PUBLISHED' | 'REJECTED' | 'NEEDS_INFO') => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/opportunities/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          collaborationRequests: state.collaborationRequests.map(r => r.id === requestId ? data : r)
        }));
        return data;
      }
      throw new Error('Failed to update collaboration request.');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkspaces: async () => {
    try {
      const res = await apiFetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        set({ workspaces: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createWorkspace: async (data: {
    title: string;
    description?: string;
    researchDomain?: string;
    researchDomainId?: string;
    researchTopic?: string;
    researchTopicId?: string;
    scholarIds?: string[];
  }) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const ws = await res.json();
      set((state) => ({ workspaces: [ws, ...state.workspaces] }));
      get().addToast('Research workspace created successfully.', 'success');
      return ws;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkspaceDetails: async (workspaceId: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        set({ activeWorkspace: data });
        return data;
      }
      throw new Error('Failed to load workspace details.');
    } finally {
      set({ isLoading: false });
    }
  },

  addWorkspaceFile: async (workspaceId: string, name: string, url: string, size: number) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, size }),
      });
      if (res.ok) {
        const fileData = await res.json();
        set(state => {
          if (state.activeWorkspace && state.activeWorkspace.id === workspaceId) {
            return {
              activeWorkspace: {
                ...state.activeWorkspace,
                files: [fileData, ...(state.activeWorkspace.files || [])]
              }
            };
          }
          return {};
        });
        return fileData;
      }
      throw new Error('Failed to add file.');
    } finally {
      set({ isLoading: false });
    }
  },

  uploadResearchFileToS3: async (file: File, prefix: string = 'research-documents') => {
    set({ isLoading: true });
    try {
      // 1. Request presigned upload URL from NestJS API
      const presignedRes = await apiFetch('/api/files/presigned-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          prefix,
        }),
      });

      if (!presignedRes.ok) {
        const err = await presignedRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to initialize secure AWS S3 upload.');
      }

      const { uploadUrl, objectKey, fileUrl } = await presignedRes.json();

      // 2. Direct browser-to-S3 PUT upload (bypassing backend server to preserve ALB/NestJS capacity)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`S3 direct upload failed with status: ${uploadRes.status}`);
      }

      return {
        fileUrl,
        objectKey,
        name: file.name,
        size: file.size,
      };
    } finally {
      set({ isLoading: false });
    }
  },

  addWorkspaceMilestone: async (workspaceId: string, title: string, description?: string, dueDate?: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, dueDate }),
      });
      if (res.ok) {
        const milestoneData = await res.json();
        set(state => {
          if (state.activeWorkspace && state.activeWorkspace.id === workspaceId) {
            return {
              activeWorkspace: {
                ...state.activeWorkspace,
                milestones: [...(state.activeWorkspace.milestones || []), milestoneData]
              }
            };
          }
          return {};
        });
        return milestoneData;
      }
      throw new Error('Failed to add milestone.');
    } finally {
      set({ isLoading: false });
    }
  },

  toggleWorkspaceMilestone: async (workspaceId: string, milestoneId: string, completed: boolean) => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (res.ok) {
        const milestoneData = await res.json();
        set(state => {
          if (state.activeWorkspace && state.activeWorkspace.id === workspaceId) {
            return {
              activeWorkspace: {
                ...state.activeWorkspace,
                milestones: (state.activeWorkspace.milestones || []).map(m => m.id === milestoneId ? milestoneData : m)
              }
            };
          }
          return {};
        });
        return milestoneData;
      }
      throw new Error('Failed to toggle milestone.');
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  addWorkspaceAnnouncement: async (workspaceId: string, title: string, content: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const data = await res.json();
        // Insert at beginning of announcements
        set((state) => ({
          activeWorkspace: state.activeWorkspace
            ? {
                ...state.activeWorkspace,
                announcements: [data, ...(state.activeWorkspace.announcements || [])]
              }
            : null
        }));
        return data;
      }
      throw new Error('Failed to add announcement');
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── INTEGRATIONS & MEETINGS ────────────────────────────────────────────────
  integrationConnections: null,
  workspaceMeetings: {},

  fetchIntegrationStatus: async () => {
    try {
      const res = await apiFetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        set({ integrationConnections: data });
        return data;
      }
      return {
        google: { provider: 'GOOGLE_WORKSPACE', status: 'NOT_CONNECTED' },
        zoom: { provider: 'ZOOM_WORKPLACE', status: 'NOT_CONNECTED' },
      } as any;
    } catch (err) {
      console.error('Error fetching integration status:', err);
      return {
        google: { provider: 'GOOGLE_WORKSPACE', status: 'NOT_CONNECTED' },
        zoom: { provider: 'ZOOM_WORKPLACE', status: 'NOT_CONNECTED' },
      } as any;
    }
  },

  getGoogleAuthUrl: async (redirectUri: string) => {
    const res = await apiFetch(`/api/integrations/google/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`);
    if (res.ok) {
      return res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Google Workspace Client ID is not configured. Please add GOOGLE_CLIENT_ID to your root .env file.');
  },

  handleGoogleCallback: async (code: string, redirectUri: string) => {
    const res = await apiFetch('/api/integrations/google/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    });
    if (res.ok) {
      const data = await res.json();
      await (get() as any).fetchIntegrationStatus();
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to complete Google Workspace connection.');
  },

  getZoomAuthUrl: async (redirectUri: string) => {
    const res = await apiFetch(`/api/integrations/zoom/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`);
    if (res.ok) {
      return res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Zoom Workplace Client ID is not configured. Please add ZOOM_CLIENT_ID to your root .env file.');
  },

  handleZoomCallback: async (code: string, redirectUri: string) => {
    const res = await apiFetch('/api/integrations/zoom/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    });
    if (res.ok) {
      const data = await res.json();
      await (get() as any).fetchIntegrationStatus();
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to complete Zoom Workplace connection.');
  },

  disconnectIntegration: async (provider: IntegrationProvider) => {
    const res = await apiFetch(`/api/integrations/${provider}/disconnect`, {
      method: 'POST',
    });
    if (res.ok) {
      await (get() as any).fetchIntegrationStatus();
      return res.json();
    }
    throw new Error(`Failed to disconnect ${provider}.`);
  },

  fetchWorkspaceMeetings: async (workspaceId: string) => {
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}/meetings`);
      if (res.ok) {
        const meetings = await res.json();
        set((state) => ({
          workspaceMeetings: {
            ...state.workspaceMeetings,
            [workspaceId]: meetings,
          },
        }));
        return meetings;
      }
      return [];
    } catch (err) {
      console.error('Error fetching workspace meetings:', err);
      return [];
    }
  },

  createWorkspaceMeeting: async (workspaceId: string, dto: any) => {
    const res = await apiFetch(`/api/workspaces/${workspaceId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (res.ok) {
      const meeting = await res.json();
      set((state) => {
        const existing = state.workspaceMeetings[workspaceId] || [];
        return {
          workspaceMeetings: {
            ...state.workspaceMeetings,
            [workspaceId]: [...existing, meeting],
          },
        };
      });
      return meeting;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to schedule meeting.');
  },

  cancelWorkspaceMeeting: async (workspaceId: string, meetingId: string) => {
    const res = await apiFetch(`/api/workspaces/${workspaceId}/meetings/${meetingId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const cancelled = await res.json();
      set((state) => {
        const existing = state.workspaceMeetings[workspaceId] || [];
        return {
          workspaceMeetings: {
            ...state.workspaceMeetings,
            [workspaceId]: existing.map((m) => (m.id === meetingId ? { ...m, status: 'CANCELLED' } : m)),
          },
        };
      });
      return cancelled;
    }
    throw new Error('Failed to cancel meeting.');
  },

  setWorkspaceCollaborationProvider: async (workspaceId: string, provider: IntegrationProvider, externalMeetingUrl?: string) => {
    const res = await apiFetch(`/api/workspaces/${workspaceId}/collaboration/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, externalMeetingUrl }),
    });
    if (res.ok) {
      const updated = await res.json();
      set((state) => ({
        activeWorkspace: state.activeWorkspace && state.activeWorkspace.id === workspaceId ? { ...state.activeWorkspace, ...updated } : state.activeWorkspace,
      }));
      return updated;
    }
    throw new Error('Failed to update collaboration provider.');
  },

  connectWorkspaceChatSpace: async (workspaceId: string) => {
    const res = await apiFetch(`/api/workspaces/${workspaceId}/collaboration/chat-space`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      set((state) => ({
        activeWorkspace: state.activeWorkspace && state.activeWorkspace.id === workspaceId
          ? {
              ...state.activeWorkspace,
              googleChatSpaceId: data.googleChatSpaceId,
              googleChatSpaceUrl: data.googleChatSpaceUrl,
            }
          : state.activeWorkspace,
      }));
      return data;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to connect Google Chat Space.');
  },

  // ─── CONTROLLED RESEARCH COLLABORATIONS ──────────────────────────────────────

  fetchCollabStatus: async (targetUserId: string, threadId?: string) => {
    try {
      const qs = threadId ? `?threadId=${threadId}` : '';
      const res = await apiFetch(`/api/collaborations/status/${targetUserId}${qs}`);
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          collabStatuses: { ...state.collabStatuses, [targetUserId]: data }
        }));
        return data;
      }
      return { status: 'NONE' };
    } catch (e) {
      console.error(e);
      return { status: 'NONE' };
    }
  },

  sendCollabRequest: async (recipientId: string, threadId?: string, message?: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/collaborations/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, threadId, message }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to send request');
      }
      const data = await res.json();
      set(state => ({
        collabStatuses: {
          ...state.collabStatuses,
          [recipientId]: { status: 'PENDING_SENT', requestId: data.id }
        },
        myCollabRequests: {
          ...state.myCollabRequests,
          sent: [data, ...state.myCollabRequests.sent]
        }
      }));
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelCollabRequest: async (requestId: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/collaborations/requests/${requestId}/cancel`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to cancel request');
      const data = await res.json();
      set(state => {
        const newSent = state.myCollabRequests.sent.filter(r => r.id !== requestId);
        return {
          myCollabRequests: { ...state.myCollabRequests, sent: newSent },
          collabStatuses: { ...state.collabStatuses, [data.recipientId]: { status: 'NONE' } }
        };
      });
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  acceptCollabRequest: async (requestId: string, provider?: IntegrationProvider) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/collaborations/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider || 'GOOGLE_WORKSPACE' }),
      });
      if (!res.ok) throw new Error('Failed to accept request');
      const data = await res.json();
      set(state => {
        const newReceived = state.myCollabRequests.received.filter(r => r.id !== requestId);
        return {
          myCollabRequests: { ...state.myCollabRequests, received: newReceived },
          myCollaborations: [data, ...state.myCollaborations]
        };
      });
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  declineCollabRequest: async (requestId: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/collaborations/requests/${requestId}/decline`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to decline request');
      const data = await res.json();
      set(state => {
        const newReceived = state.myCollabRequests.received.filter(r => r.id !== requestId);
        return {
          myCollabRequests: { ...state.myCollabRequests, received: newReceived }
        };
      });
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyCollaborations: async () => {
    try {
      const res = await apiFetch('/api/collaborations');
      if (res.ok) {
        const data = await res.json();
        set({ myCollaborations: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  fetchMyCollabRequests: async () => {
    try {
      const res = await apiFetch('/api/collaborations/requests');
      if (res.ok) {
        const data = await res.json();
        set({ myCollabRequests: data });
        return data;
      }
      return { sent: [], received: [] };
    } catch (e) {
      console.error(e);
      return { sent: [], received: [] };
    }
  },

  fetchCollabMessages: async (collabId: string, page: number = 1) => {
    try {
      const res = await apiFetch(`/api/collaborations/${collabId}/messages?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        set(state => {
          if (page === 1) {
            return { activeCollabMessages: data.messages };
          }
          // Assuming older messages are pushed to front or back depending on UI, 
          // but typically we'll just prepend or append. Let's do a simple replacement for now.
          return { activeCollabMessages: [...data.messages, ...state.activeCollabMessages] };
        });
        return data.messages;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  sendCollabMessage: async (collabId: string, content: string) => {
    try {
      const res = await apiFetch(`/api/collaborations/${collabId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          activeCollabMessages: [...state.activeCollabMessages, data]
        }));
        return data;
      }
      throw new Error('Failed to send message');
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  fetchAdminUsers: async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        set({ adminUsers: data });
        return data;
      }
      const fallbackRes = await apiFetch('/api/users/all');
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        set({ adminUsers: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  fetchAdminAuditLogs: async () => {
    try {
      const res = await apiFetch('/api/users/audit-logs');
      if (res.ok) {
        const data = await res.json();
        set({ adminAuditLogs: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  changeUserRole: async (userId: string, role: UserRole) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          adminUsers: state.adminUsers.map(u => u.id === userId ? data : u)
        }));
        return data;
      }
      const fallbackRes = await apiFetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        set(state => ({
          adminUsers: state.adminUsers.map(u => u.id === userId ? data : u)
        }));
        return data;
      }
      throw new Error('Failed to update user role.');
    } finally {
      set({ isLoading: false });
    }
  },

  createAdminUser: async (data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const newUser = await res.json();
      set((state) => ({ adminUsers: [newUser, ...state.adminUsers] }));
      get().addToast('User provisioned successfully', 'success');
      return newUser;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateAdminUser: async (id, data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updatedUser = await res.json();
      set((state) => ({
        adminUsers: state.adminUsers.map((u) => (u.id === id ? updatedUser : u)),
      }));
      get().addToast('User updated successfully', 'success');
      return updatedUser;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAdminUser: async (id, reason = 'Administrative account deletion') => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      set((state) => ({
        adminUsers: state.adminUsers.filter((u) => u.id !== id),
      }));
      get().addToast('User deleted successfully', 'success');
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateAdminUserAffiliation: async (userId: string, data: { facultyId: string; departmentId: string; reason?: string }) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/affiliation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updated = await res.json();
      get().addToast('User affiliation updated', 'success');
      return updated;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    }
  },

  importAdminUsers: async (formData) => {
    set({ isLoading: true });
    try {
      const headers = await getAuthHeaders();
      const cleanedHeaders = { ...headers };
      delete (cleanedHeaders as any)['Content-Type'];

      const res = await fetch(`${API_URL}/api/admin/users/import`, {
        method: 'POST',
        headers: cleanedHeaders,
        body: formData,
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      await get().fetchAdminUsers();
      get().addToast('Bulk user import completed', 'success');
      return data;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── COMPREHENSIVE GOVERNANCE IMPLEMENTATIONS ─────────────────────────────

  fetchAdminDashboardStats: async () => {
    try {
      const res = await apiFetch('/api/admin/dashboard/stats');
      if (res.ok) return await res.json();
      return {
        totalUsers: 0,
        activeScholars: 0,
        activeSupervisors: 0,
        activeAdmins: 0,
        suspendedAccounts: 0,
        activeWorkspaces: 0,
        publications: 0,
        posts: 0,
        openReports: 0,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchAdminNeedsAttention: async () => {
    try {
      const res = await apiFetch('/api/admin/dashboard/needs-attention');
      if (res.ok) return await res.json();
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  fetchAdminUsersPaginated: async (query = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          params.append(k, String(query[k]));
        }
      });
      const res = await apiFetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) return await res.json();
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    } catch (e) {
      console.error(e);
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    }
  },

  fetchAdminUserGovernanceProfile: async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/users/${id}/profile`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  suspendUser: async (userId: string, reason: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      get().addToast('User suspended with audit record', 'info');
      return data;
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  reactivateUser: async (userId: string, reason: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      get().addToast('User reactivated with audit record', 'success');
      return data;
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  deactivateUser: async (userId: string, reason: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      get().addToast('User deactivated with audit record', 'info');
      return data;
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  reassignSupervisor: async (scholarId: string, supervisorId: string, reason: string) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/admin/users/${scholarId}/reassign-supervisor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisorId, reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      get().addToast('Supervisor reassigned and parties notified', 'success');
      return data;
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAdminModerationReports: async (query = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          params.append(k, String(query[k]));
        }
      });
      const res = await apiFetch(`/api/admin/moderation/reports?${params.toString()}`);
      if (res.ok) return await res.json();
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    } catch (e) {
      console.error(e);
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    }
  },

  resolveModerationReport: async (id: string, resolutionNote: string) => {
    try {
      const res = await apiFetch(`/api/admin/moderation/reports/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Report resolved', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  dismissModerationReport: async (id: string, reason: string) => {
    try {
      const res = await apiFetch(`/api/admin/moderation/reports/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Report dismissed', 'info');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  fetchAdminPosts: async (query = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          params.append(k, String(query[k]));
        }
      });
      const res = await apiFetch(`/api/admin/content/posts?${params.toString()}`);
      if (res.ok) return await res.json();
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    } catch (e) {
      console.error(e);
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    }
  },

  hideAdminPost: async (id: string, reason: string) => {
    try {
      const res = await apiFetch(`/api/admin/content/posts/${id}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Post hidden from public feed', 'info');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  restoreAdminPost: async (id: string, reason = '') => {
    try {
      const res = await apiFetch(`/api/admin/content/posts/${id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Post restored to public feed', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  deleteAdminPost: async (id: string, reason: string) => {
    try {
      const res = await apiFetch(`/api/admin/content/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Post permanently deleted', 'info');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  fetchAdminPublicationsList: async (query = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          params.append(k, String(query[k]));
        }
      });
      const res = await apiFetch(`/api/admin/content/publications?${params.toString()}`);
      if (res.ok) return await res.json();
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    } catch (e) {
      console.error(e);
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    }
  },

  hideAdminPublication: async (id: string, reason: string) => {
    try {
      const res = await apiFetch(`/api/admin/content/publications/${id}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Publication hidden for policy review', 'info');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  restoreAdminPublication: async (id: string, reason = '') => {
    try {
      const res = await apiFetch(`/api/admin/content/publications/${id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Publication restored to active catalog', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  fetchAdminFaculties: async () => {
    try {
      const res = await apiFetch('/api/admin/institution/faculties');
      if (res.ok) return await res.json();
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createAdminFaculty: async (name: string) => {
    try {
      const res = await apiFetch('/api/admin/institution/faculties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Faculty created', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  updateAdminFaculty: async (id: string, name: string) => {
    try {
      const res = await apiFetch(`/api/admin/institution/faculties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Faculty updated', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  deleteAdminFaculty: async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/institution/faculties/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Faculty deleted', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  fetchAdminDepartments: async () => {
    try {
      const res = await apiFetch('/api/admin/institution/departments');
      if (res.ok) return await res.json();
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createAdminDepartment: async (data: any) => {
    try {
      const res = await apiFetch('/api/admin/institution/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Department created', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  updateAdminDepartment: async (id: string, data: any) => {
    try {
      const res = await apiFetch(`/api/admin/institution/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Department updated', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  deleteAdminDepartment: async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/institution/departments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Department deleted', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  fetchAdminCampuses: async () => {
    try {
      const res = await apiFetch('/api/admin/institution/campuses');
      if (res.ok) return await res.json();
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createAdminCampus: async (data: any) => {
    try {
      const res = await apiFetch('/api/admin/institution/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Campus created', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  updateAdminCampus: async (id: string, data: any) => {
    try {
      const res = await apiFetch(`/api/admin/institution/campuses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Campus updated', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  fetchAdminAuditLogsPaginated: async (query = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          params.append(k, String(query[k]));
        }
      });
      const res = await apiFetch(`/api/admin/audit/logs?${params.toString()}`);
      if (res.ok) return await res.json();
      return { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 1 } };
    } catch (e) {
      console.error(e);
      return { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 1 } };
    }
  },

  fetchAdminSecurityEvents: async (query = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          params.append(k, String(query[k]));
        }
      });
      const res = await apiFetch(`/api/admin/audit/security-events?${params.toString()}`);
      if (res.ok) return await res.json();
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    } catch (e) {
      console.error(e);
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    }
  },

  fetchAdminAnalytics: async (range = '30D') => {
    try {
      const res = await apiFetch(`/api/admin/analytics?range=${range}`);
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchAdminRolesMatrix: async () => {
    try {
      const res = await apiFetch('/api/admin/roles-permissions');
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchAdminSettings: async () => {
    try {
      const res = await apiFetch('/api/admin/settings');
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  updateAdminSetting: async (key: string, value: any, category = 'GENERAL') => {
    try {
      const res = await apiFetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, category }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      get().addToast('Settings updated', 'success');
      return await res.json();
    } catch (e: any) {
      get().addToast(e.message, 'error');
      throw e;
    }
  },

  fetchAdminEmailStats: async () => {
    try {
      const res = await apiFetch('/api/admin/settings/email-delivery');
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchAdminResearchGovernance: async () => {
    try {
      const res = await apiFetch('/api/admin/research-governance/overview');
      if (res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  fetchAdminWorkspaces: async (query = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((k) => {
        if (query[k] !== undefined && query[k] !== null && query[k] !== '') {
          params.append(k, String(query[k]));
        }
      });
      const res = await apiFetch(`/api/admin/research-governance/workspaces?${params.toString()}`);
      if (res.ok) return await res.json();
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    } catch (e) {
      console.error(e);
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    }
  },

  fetchPendingScholars: async () => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/supervisor/pending-scholars');
      if (res.ok) {
        const data = await res.json();
        set({ pendingApprovals: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  supervisorApproveScholar: async (requestId) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/supervisor/approve/${requestId}`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const updatedScholar = await res.json();
      set((state) => ({
        pendingApprovals: state.pendingApprovals.filter((s: any) => s.requestId !== requestId),
        myScholars: [...state.myScholars, updatedScholar],
      }));
      get().addToast('Scholar approved successfully', 'success');
      return updatedScholar;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  supervisorRejectScholar: async (requestId) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/supervisor/reject/${requestId}`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const rejectedScholar = await res.json();
      set((state) => ({
        pendingApprovals: state.pendingApprovals.filter((s: any) => s.requestId !== requestId),
      }));
      get().addToast('Scholar rejected successfully', 'info');
      return rejectedScholar;
    } catch (err: any) {
      get().addToast(err.message, 'error');
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPublications: async (userId?: string) => {
    try {
      const url = userId ? `/api/publications?userId=${userId}` : '/api/publications';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        set({ publications: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createPublication: async (data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const pub = await res.json();
        set((state) => ({ publications: [pub, ...state.publications] }));
        return pub;
      }
      throw new Error('Failed to create publication.');
    } finally {
      set({ isLoading: false });
    }
  },

  updatePublication: async (id, data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/publications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const pub = await res.json();
        set((state) => ({
          publications: state.publications.map((p) => (p.id === id ? pub : p)),
        }));
        return pub;
      }
      throw new Error('Failed to update publication.');
    } finally {
      set({ isLoading: false });
    }
  },

  deletePublication: async (id) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/publications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        set((state) => ({
          publications: state.publications.filter((p) => p.id !== id),
        }));
        return;
      }
      throw new Error('Failed to delete publication.');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchReports: async () => {
    try {
      const res = await apiFetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        set({ reports: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  submitReport: async (data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const report = await res.json();
        set((state) => ({ reports: [report, ...state.reports] }));
        return report;
      }
      throw new Error('Failed to submit report.');
    } finally {
      set({ isLoading: false });
    }
  },

  reviewReport: async (id, status, feedback) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/reports/${id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedback }),
      });
      if (res.ok) {
        const report = await res.json();
        set((state) => ({
          reports: state.reports.map((r) => (r.id === id ? report : r)),
        }));
        return report;
      }
      throw new Error('Failed to review report.');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDepartments: async () => {
    try {
      const res = await apiFetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        set({ departments: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createDepartment: async (data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const dept = await res.json();
        set((state) => ({ departments: [...state.departments, dept] }));
        return dept;
      }
      throw new Error('Failed to create department.');
    } finally {
      set({ isLoading: false });
    }
  },

  updateDepartment: async (id, data) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const dept = await res.json();
        set((state) => ({
          departments: state.departments.map((d) => (d.id === id ? dept : d)),
        }));
        return dept;
      }
      throw new Error('Failed to update department.');
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDepartment: async (id) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/departments/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        set((state) => ({
          departments: state.departments.filter((d) => d.id !== id),
        }));
        return;
      }
      throw new Error('Failed to delete department.');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSupervisors: async () => {
    try {
      const res = await apiFetch('/api/users/supervisors');
      if (res.ok) {
        const data = await res.json();
        set({ supervisors: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  fetchMyScholars: async () => {
    try {
      const res = await apiFetch('/api/users/my-scholars');
      if (res.ok) {
        const data = await res.json();
        set({ myScholars: data });
        return data;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  fetchNotifications: async () => {
    try {
      const res = await apiFetch('/api/notifications');
      let loaded: Notification[] = [];
      let serverUnreadCount = 0;
      if (res.ok) {
        const data = await res.json();
        // The API now returns { notifications: [], unreadCount: number }
        const notifs = data.notifications || [];
        serverUnreadCount = typeof data.unreadCount === 'number' ? data.unreadCount : 0;
        
        if (Array.isArray(notifs) && notifs.length > 0) {
          loaded = notifs.map((n: any) => ({
            id: n.id,
            userId: n.userId,
            eventId: n.eventId,
            title: n.title || 'Institutional Notification',
            body: n.body || n.message || '',
            sentStatus: n.sentStatus,
            openedStatus: n.openedStatus,
            readAt: n.readAt,
            isRead: !!n.readAt,
            type: n.type || deriveNotificationType(n.title),
            href: n.href || n.actionUrl || deriveNotificationHref(n.type, n.title),
            createdAt: n.createdAt || new Date().toISOString()
          }));
        }
      }

      set({ notifications: loaded, unreadCount: serverUnreadCount });
      return loaded;
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
      set({ notifications: [], unreadCount: 0 });
      return [];
    }
  },

  markNotificationAsRead: async (id: string) => {
    const prevState = get().notifications;
    const prevCount = get().unreadCount;
    const target = prevState.find(n => n.id === id);
    if (target && target.isRead) return; // Idempotency check

    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString(), openedStatus: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
    
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      if (!res.ok) throw new Error('API failed');
    } catch (e) {
      // Rollback optimistic update
      set({ notifications: prevState, unreadCount: prevCount });
      get().addToast('Failed to update notification status', 'error');
    }
  },

  markAllNotificationsAsRead: async () => {
    const prevState = get().notifications;
    const prevCount = get().unreadCount;
    if (prevCount === 0) return; // Idempotency check

    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true, readAt: (n as any).readAt || new Date().toISOString(), openedStatus: true })),
      unreadCount: 0
    }));
    
    try {
      const res = await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      if (!res.ok) throw new Error('API failed');
    } catch (e) {
      // Rollback optimistic update
      set({ notifications: prevState, unreadCount: prevCount });
      get().addToast('Failed to mark all as read', 'error');
    }
  },

  addNotification: (data: Partial<Notification>) => {
    const newNotif: Notification = {
      id: data.id || `notif-${Date.now()}`,
      title: data.title || 'New Notification',
      body: data.body || data.message || '',
      type: data.type || 'SYSTEM',
      isRead: false,
      href: data.href || data.actionUrl || '/notifications',
      createdAt: data.createdAt || new Date().toISOString()
    };
    set(state => ({
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },

  suspendUserToggle: async (userId: string, suspended: boolean) => {
    set({ isLoading: true });
    try {
      const res = await apiFetch(`/api/users/${userId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended }),
      });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          adminUsers: state.adminUsers.map((u) => (u.id === userId ? { ...u, suspended: data.suspended } : u)),
        }));
        return data;
      }
      throw new Error('Failed to suspend/unsuspend user.');
    } finally {
      set({ isLoading: false });
    }
  },

  addToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // ─── MY RESEARCH API ACTIONS ─────────────────────────────────────────────
  fetchMyResearch: async () => {
    try {
      const res = await apiFetch('/api/my-research');
      if (res.ok) {
        const data = await res.json();
        set({
          myResearchProfile: data,
          myResearchMilestones: data.milestones || [],
          myResearchActivities: data.activities || [],
        });
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch my research profile:', err);
    }
    return null;
  },

  updateResearchProfile: async (data: any) => {
    try {
      const res = await apiFetch('/api/my-research', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          myResearchProfile: {
            ...state.myResearchProfile,
            ...updated,
          },
          myResearchMilestones: updated.milestones || state.myResearchMilestones,
          myResearchActivities: updated.activities || state.myResearchActivities,
        }));
        get().addToast('Research profile updated successfully.', 'success');
        return updated;
      }
      throw new Error('Failed to update research profile');
    } catch (err: any) {
      get().addToast(err.message || 'Failed to update research profile', 'error');
      throw err;
    }
  },

  fetchMyResearchMilestones: async () => {
    try {
      const res = await apiFetch('/api/my-research/milestones');
      if (res.ok) {
        const milestones = await res.json();
        set({ myResearchMilestones: milestones });
        return milestones;
      }
    } catch (err) {
      console.error('Failed to fetch research milestones:', err);
    }
    return [];
  },

  createResearchMilestone: async (data: any) => {
    try {
      const res = await apiFetch('/api/my-research/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const milestone = await res.json();
        get().addToast(`Milestone "${data.title}" added`, 'success');
        await get().fetchMyResearch();
        return milestone;
      }
      throw new Error('Failed to create milestone');
    } catch (err: any) {
      get().addToast(err.message || 'Failed to create milestone', 'error');
      throw err;
    }
  },

  updateMilestone: async (id: string, data: any) => {
    try {
      const res = await apiFetch(`/api/my-research/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        get().addToast('Milestone updated', 'success');
        await get().fetchMyResearch();
        return updated;
      }
      throw new Error('Failed to update milestone');
    } catch (err: any) {
      get().addToast(err.message || 'Failed to update milestone', 'error');
      throw err;
    }
  },

  completeMilestone: async (id: string) => {
    try {
      const res = await apiFetch(`/api/my-research/milestones/${id}/complete`, {
        method: 'POST',
      });
      if (res.ok) {
        const completed = await res.json();
        get().addToast(`Milestone marked as complete!`, 'success');
        await get().fetchMyResearch();
        return completed;
      }
      throw new Error('Failed to complete milestone');
    } catch (err: any) {
      get().addToast(err.message || 'Failed to complete milestone', 'error');
      throw err;
    }
  },

  fetchMyResearchActivity: async () => {
    try {
      const res = await apiFetch('/api/my-research/activity');
      if (res.ok) {
        const activities = await res.json();
        set({ myResearchActivities: activities });
        return activities;
      }
    } catch (err) {
      console.error('Failed to fetch research activities:', err);
    }
    return [];
  },

  fetchMyResearchMaterials: async () => {
    try {
      const res = await apiFetch('/api/my-research/materials');
      if (res.ok) {
        const materials = await res.json();
        set({ myResearchMaterials: materials });
        return materials;
      }
    } catch (err) {
      console.error('Failed to fetch research materials:', err);
    }
    return [];
  },

  // ─── EXTERNAL LINKS ACTIONS ──────────────────────────────────────────────
  fetchUserExternalLinks: async (userId: string) => {
    try {
      const res = await apiFetch(`/api/users/${userId}/external-links`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch user external links:', err);
    }
    return [];
  },

  addExternalLink: async (userId: string, data: { platform: string; label?: string; url: string }) => {
    try {
      const res = await apiFetch(`/api/users/${userId}/external-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const link = await res.json();
        get().addToast(`Added ${data.platform} profile link`, 'success');
        return link;
      }
      const errData = await res.json();
      throw new Error(errData.message || 'Failed to add external link');
    } catch (err: any) {
      get().addToast(err.message || 'Failed to add external link', 'error');
      throw err;
    }
  },

  updateExternalLink: async (userId: string, linkId: string, data: { label?: string; url?: string; isVisible?: boolean }) => {
    try {
      const res = await apiFetch(`/api/users/${userId}/external-links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        get().addToast('Updated external link', 'success');
        return updated;
      }
      throw new Error('Failed to update external link');
    } catch (err: any) {
      get().addToast(err.message || 'Failed to update external link', 'error');
      throw err;
    }
  },

  deleteExternalLink: async (userId: string, linkId: string) => {
    try {
      const res = await apiFetch(`/api/users/${userId}/external-links/${linkId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        get().addToast('External link removed', 'info');
        return;
      }
      throw new Error('Failed to delete external link');
    } catch (err: any) {
      get().addToast(err.message || 'Failed to delete external link', 'error');
      throw err;
    }
  }
}));
