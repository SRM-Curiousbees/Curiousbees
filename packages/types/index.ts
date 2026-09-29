export type UserRole = 'RESEARCH_SCHOLAR' | 'RESEARCH_SUPERVISOR' | 'INSTITUTE_ADMIN';

export interface User {
  id: string;
  clerkId: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  department: string | null;
  departmentId: string | null;
  departmentRef?: Department | null;
  faculty?: string | null;
  supervisorProfile?: any;
  bio: string | null;
  onboardingCompleted: boolean;
  approved: boolean;
  status: string;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  suspended: boolean;
  supervisorId: string | null;
  supervisorEmail: string | null;
  employeeId: string | null;
  createdAt: Date | string;
  interests?: UserInterest[];
  threads?: Thread[];
  comments?: Comment[];
  opportunities?: Opportunity[];
  supervisor?: User | null;
  scholars?: User[];
  publications?: Publication[];
  submittedReports?: Report[];
  reviewedReports?: Report[];
}

export interface ResearchInterest {
  id: string;
  name: string;
}

export interface UserInterest {
  userId: string;
  interestId: string;
  interest?: ResearchInterest;
}

export interface ThreadAttachment {
  id: string;
  threadId: string;
  name: string;
  url: string;
  size: number;
  type: 'PDF' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  createdAt: Date | string;
}

export interface ThreadLike {
  id: string;
  threadId: string;
  userId: string;
  createdAt: Date | string;
}

export interface ThreadShare {
  id: string;
  threadId: string;
  userId: string;
  platform?: string | null;
  createdAt: Date | string;
}

export interface ThreadReport {
  id: string;
  threadId: string;
  reporterId: string;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: Date | string;
}

export interface SavedThread {
  id: string;
  threadId: string;
  userId: string;
  createdAt: Date | string;
}

export interface ResearchConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'PENDING' | 'CONNECTED' | 'REJECTED';
  createdAt: Date | string;
  updatedAt: Date | string;
  requester?: User;
  receiver?: User;
}

export interface Thread {
  id: string;
  title: string;
  content: string;
  type?: 'TEXT' | 'RESEARCH_UPDATE' | 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT';
  isPaper?: boolean;
  paperJournal?: string | null;
  authorId: string;
  author?: User;
  tags: string[];
  comments?: Comment[];
  attachments?: ThreadAttachment[];
  likes?: ThreadLike[];
  shares?: ThreadShare[];
  reports?: ThreadReport[];
  saves?: SavedThread[];
  _count?: { comments?: number, likes?: number, shares?: number, saves?: number };
  createdAt: Date | string;
}

export interface Comment {
  id: string;
  content: string;
  threadId: string;
  thread?: Thread;
  authorId: string;
  author?: User;
  parentId?: string | null;
  parent?: Comment | null;
  replies?: Comment[];
  createdAt: Date | string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  department: string;
  researchDomain: string;
  opportunityType?: string;
  positionsCount?: number;
  funding?: string;
  fundingDetails?: string | null;
  eligibility?: string[];
  deadline?: Date | string | null;
  mode?: string;
  applicationMethod?: string;
  applicationUrl?: string | null;
  applicationEmail?: string | null;
  authorId: string;
  author?: User;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// REST API Request / Response Types
export interface CreateThreadInput {
  title: string;
  content: string;
  tags: string[];
  type?: 'TEXT' | 'RESEARCH_UPDATE' | 'DISCUSSION' | 'QUESTION' | 'ANNOUNCEMENT' | 'PUBLICATION' | 'ACHIEVEMENT' | 'COLLABORATION_REQUEST';
  attachments?: { name: string; url: string; size: number; type: 'PDF' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' }[];
}

export interface CreateCommentInput {
  content: string;
  threadId: string;
  parentId?: string;
}

export interface CreateOpportunityInput {
  title: string;
  description: string;
  department?: string;
  departmentId?: string;
  researchDomain: string;
  opportunityType?: string;
  positionsCount?: number;
  funding?: string;
  fundingDetails?: string;
  eligibility?: string[];
  deadline?: string | null;
  mode?: string;
  applicationMethod?: string;
  applicationUrl?: string;
  applicationEmail?: string;
}

export interface UpdateProfileInput {
  name?: string;
  role?: UserRole;
  department?: string;
  departmentId?: string;
  bio?: string;
  interests?: string[]; // Array of interest names
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  department?: string;
  venue: string;
  date: string;
  time: string;
  category?: string;
  organizerEmail?: string;
  posterUrl?: string;
  registrationLink?: string;
  createdByAi?: boolean;
  approvalStatus?: 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'NEEDS_INFO';
  tags?: string[];
  createdAt?: string;
  authorId?: string;
  eventType?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

export interface CreateEventInput {
  event: string;
  date: string;
  time: string;
  venue: string;
}

export interface CollaborationRequest {
  id: string;
  scholarId: string;
  opportunityId?: string | null;
  threadId?: string | null;
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'NEEDS_INFO';
  message: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  scholar?: User;
  opportunity?: Opportunity;
  thread?: Thread;
}

export type CollabRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
export type CollaborationStatus = 'ACTIVE' | 'CLOSED';

export interface ResearchCollabRequest {
  id: string;
  requesterId: string;
  recipientId: string;
  threadId?: string | null;
  message?: string | null;
  status: CollabRequestStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  
  requester?: User;
  recipient?: User;
  thread?: Thread;
}

export interface ResearchCollaboration {
  id: string;
  requesterId: string;
  recipientId: string;
  threadId?: string | null;
  workspaceId?: string | null;
  status: CollaborationStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActivityAt: Date | string;

  requester?: User;
  recipient?: User;
  thread?: Thread;
  workspace?: Workspace;
  messages?: CollaborationMessage[];
}

export interface CollaborationMessage {
  id: string;
  collaborationId: string;
  senderId: string;
  content: string;
  createdAt: Date | string;

  sender?: User;
}

export interface CollaborationStatusResponse {
  status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACTIVE';
  requestId?: string;
  collaborationId?: string;
}

export type IntegrationProvider = 'GOOGLE_WORKSPACE' | 'ZOOM_WORKPLACE' | 'EXTERNAL';
export type IntegrationStatus = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'EXPIRED' | 'REAUTH_REQUIRED' | 'DISCONNECTED' | 'ERROR';
export type MeetingProvider = 'GOOGLE_MEET' | 'ZOOM' | 'EXTERNAL';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface IntegrationConnection {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  externalAccountId?: string | null;
  externalAccountEmail?: string | null;
  tokenExpiresAt?: Date | string | null;
  scopes?: string | null;
  lastError?: string | null;
  connectedAt?: Date | string | null;
  updatedAt: Date | string;
}

export interface ResearchMeeting {
  id: string;
  workspaceId: string;
  createdById: string;
  provider: MeetingProvider;
  externalMeetingId?: string | null;
  meetingUrl: string;
  title: string;
  description?: string | null;
  scheduledAt: Date | string;
  duration: number;
  status: MeetingStatus;
  recordingUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: User;
}

export interface InstitutionIntegrationSetting {
  id: string;
  googleWorkspaceEnabled: boolean;
  zoomWorkplaceEnabled: boolean;
  externalLinksEnabled: boolean;
  updatedAt: Date | string;
}

export interface Workspace {
  id: string;
  title: string;
  description: string | null;
  collaborationProvider?: IntegrationProvider;
  googleChatSpaceId?: string | null;
  googleChatSpaceUrl?: string | null;
  zoomMeetingId?: string | null;
  zoomJoinUrl?: string | null;
  externalMeetingUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  members?: WorkspaceMember[];
  files?: WorkspaceFile[];
  milestones?: WorkspaceMilestone[];
  announcements?: WorkspaceAnnouncement[];
  meetings?: ResearchMeeting[];
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: Date | string;
  user?: User;
  workspace?: Workspace;
}

export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  name: string;
  /** External link for link-type files; null for uploaded files. */
  url?: string | null;
  /** Private S3 object key for uploaded files. Download via the API, never directly. */
  storageKey?: string | null;
  contentType?: string | null;
  /** Bytes */
  size: number;
  uploadedById: string;
  uploadedAt: Date | string;
  uploadedBy?: User;
}

export interface WorkspaceMilestone {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WorkspaceAnnouncement {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date | string;
  author?: User;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
}

export interface Faculty {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  departments?: Department[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  facultyId: string | null;
  faculty?: Faculty | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  users?: User[];
}

export interface Publication {
  id: string;
  title: string;
  authors: string;
  doi: string | null;
  publisher: string | null;
  year: number;
  status: string; // "DRAFT" | "SUBMITTED" | "PUBLISHED" | "UNDER_REVIEW"
  userId: string;
  user?: User;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Report {
  id: string;
  title: string;
  description: string | null;
  status: string; // "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO"
  evidenceUrl: string | null;
  feedback: string | null;
  scholarId: string;
  scholar?: User;
  supervisorId: string;
  supervisor?: User;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type NotificationType = 
  | 'RESEARCH_PAPER' 
  | 'OPPORTUNITY' 
  | 'COLLABORATION' 
  | 'ADVISORY' 
  | 'EVENT' 
  | 'SYSTEM'
  | 'POST'
  | 'SUPERVISION'
  | 'COLLABORATION_REQUEST'
  | 'COLLABORATION_ACCEPTED'
  | 'COLLABORATION_DECLINED'
  | 'COLLABORATION_MESSAGE';

export interface Notification {
  id: string;
  userId?: string;
  eventId?: string | null;
  type?: NotificationType;
  title: string;
  body: string;
  message?: string;
  sentStatus?: boolean;
  openedStatus?: boolean;
  isRead?: boolean;
  actionUrl?: string;
  href?: string;
  time?: string;
  createdAt: Date | string;
}

// My Research Module Types
export type ResearchStatus = 'ACTIVE' | 'NOT_STARTED' | 'ON_HOLD' | 'COMPLETED';

export type ResearchStage = 
  | 'PROPOSAL' 
  | 'LITERATURE_REVIEW' 
  | 'METHODOLOGY' 
  | 'IMPLEMENTATION' 
  | 'EVALUATION' 
  | 'THESIS_PUBLICATION';

export type MilestoneStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type MilestonePriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ResearchMilestone {
  id: string;
  researchProfileId: string;
  title: string;
  description?: string | null;
  stage: ResearchStage;
  status: MilestoneStatus;
  priority: MilestonePriority;
  dueDate?: Date | string | null;
  completedAt?: Date | string | null;
  createdById?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ResearchActivity {
  id: string;
  researchProfileId: string;
  actorId: string;
  actor?: User;
  type: string;
  description: string;
  metadata?: string | null;
  createdAt: Date | string;
}

export interface ResearchProfile {
  id: string;
  scholarId: string;
  scholar?: User;
  title: string;
  researchArea: string;
  abstract?: string | null;
  status: ResearchStatus;
  currentStage: ResearchStage;
  startDate?: Date | string | null;
  expectedCompletionDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  milestones?: ResearchMilestone[];
  activities?: ResearchActivity[];
  supervisor?: any;
  activeCollabId?: string | null;
}

export interface ResearcherExternalLink {
  id: string;
  userId: string;
  platform: 'ORCID' | 'GOOGLE_SCHOLAR' | 'RESEARCHGATE' | 'GITHUB' | 'LINKEDIN' | 'WEBSITE' | 'PORTFOLIO' | 'YOUTUBE' | 'TWITTER' | 'OTHER' | string;
  label?: string | null;
  url: string;
  isVisible: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}


