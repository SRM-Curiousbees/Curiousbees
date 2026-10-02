-- Email → event ingestion (n8n). Additive only: new nullable Event columns, venue made
-- optional, and the EventIngestion table that records each processed Gmail message.

-- CreateEnum
CREATE TYPE "EventIngestionStatus" AS ENUM ('SKIPPED', 'AI_FAILED', 'NOT_EVENT', 'REVIEW_REQUIRED', 'CREATED', 'DUPLICATE', 'DISMISSED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "createdByType" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "eventUrl" TEXT,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "organizer" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceMessageId" TEXT,
ADD COLUMN     "sourceProvider" TEXT,
ADD COLUMN     "sourceThreadId" TEXT,
ADD COLUMN     "timezone" TEXT,
ALTER COLUMN "venue" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EventIngestion" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "sourceMessageId" TEXT NOT NULL,
    "sourceThreadId" TEXT,
    "senderEmail" TEXT,
    "senderDomain" TEXT,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3),
    "trustedSender" BOOLEAN NOT NULL DEFAULT false,
    "status" "EventIngestionStatus" NOT NULL,
    "reason" TEXT,
    "confidence" DOUBLE PRECISION,
    "extracted" JSONB,
    "prefilterScore" INTEGER,
    "aiModel" TEXT,
    "aiInputTokens" INTEGER,
    "aiOutputTokens" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "eventId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventIngestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventIngestion_sourceMessageId_key" ON "EventIngestion"("sourceMessageId");

-- CreateIndex
CREATE INDEX "EventIngestion_status_createdAt_idx" ON "EventIngestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EventIngestion_eventId_idx" ON "EventIngestion"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_sourceMessageId_key" ON "Event"("sourceMessageId");

-- AddForeignKey
ALTER TABLE "EventIngestion" ADD CONSTRAINT "EventIngestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventIngestion" ADD CONSTRAINT "EventIngestion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

