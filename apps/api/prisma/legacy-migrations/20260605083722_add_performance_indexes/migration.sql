-- CreateIndex
CREATE INDEX "Comment_threadId_idx" ON "Comment"("threadId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_eventId_idx" ON "Notification"("eventId");

-- CreateIndex
CREATE INDEX "Opportunity_authorId_idx" ON "Opportunity"("authorId");

-- CreateIndex
CREATE INDEX "Publication_userId_idx" ON "Publication"("userId");

-- CreateIndex
CREATE INDEX "Report_scholarId_idx" ON "Report"("scholarId");

-- CreateIndex
CREATE INDEX "Report_supervisorId_idx" ON "Report"("supervisorId");

-- CreateIndex
CREATE INDEX "Thread_authorId_idx" ON "Thread"("authorId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");

-- CreateIndex
CREATE INDEX "WorkspaceAnnouncement_workspaceId_idx" ON "WorkspaceAnnouncement"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceAnnouncement_authorId_idx" ON "WorkspaceAnnouncement"("authorId");

-- CreateIndex
CREATE INDEX "WorkspaceFile_workspaceId_idx" ON "WorkspaceFile"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceFile_uploadedById_idx" ON "WorkspaceFile"("uploadedById");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMilestone_workspaceId_idx" ON "WorkspaceMilestone"("workspaceId");
