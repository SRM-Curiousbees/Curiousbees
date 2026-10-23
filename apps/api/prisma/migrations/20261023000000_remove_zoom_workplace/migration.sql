-- AlterEnum
BEGIN;
CREATE TYPE "IntegrationProvider_new" AS ENUM ('GOOGLE_WORKSPACE', 'EXTERNAL');
ALTER TABLE "public"."Workspace" ALTER COLUMN "collaborationProvider" DROP DEFAULT;
ALTER TABLE "Workspace" ALTER COLUMN "collaborationProvider" TYPE "IntegrationProvider_new" USING ("collaborationProvider"::text::"IntegrationProvider_new");
ALTER TABLE "IntegrationConnection" ALTER COLUMN "provider" TYPE "IntegrationProvider_new" USING ("provider"::text::"IntegrationProvider_new");
ALTER TYPE "IntegrationProvider" RENAME TO "IntegrationProvider_old";
ALTER TYPE "IntegrationProvider_new" RENAME TO "IntegrationProvider";
DROP TYPE "public"."IntegrationProvider_old";
ALTER TABLE "Workspace" ALTER COLUMN "collaborationProvider" SET DEFAULT 'GOOGLE_WORKSPACE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MeetingProvider_new" AS ENUM ('GOOGLE_MEET', 'EXTERNAL');
ALTER TABLE "public"."ResearchMeeting" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "ResearchMeeting" ALTER COLUMN "provider" TYPE "MeetingProvider_new" USING ("provider"::text::"MeetingProvider_new");
ALTER TYPE "MeetingProvider" RENAME TO "MeetingProvider_old";
ALTER TYPE "MeetingProvider_new" RENAME TO "MeetingProvider";
DROP TYPE "public"."MeetingProvider_old";
ALTER TABLE "ResearchMeeting" ALTER COLUMN "provider" SET DEFAULT 'GOOGLE_MEET';
COMMIT;

-- AlterTable
ALTER TABLE "InstitutionIntegrationSetting" DROP COLUMN "zoomWorkplaceEnabled";

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "zoomJoinUrl",
DROP COLUMN "zoomMeetingId";
