-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_facultyId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- AlterTable
ALTER TABLE "Faculty" ADD COLUMN IF NOT EXISTS "campusId" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Event_departmentId_idx" ON "Event"("departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Faculty_campusId_idx" ON "Faculty"("campusId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Opportunity_departmentId_idx" ON "Opportunity"("departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPreference_departmentId_idx" ON "UserPreference"("departmentId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Opportunity_departmentId_fkey'
  ) THEN
    ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Event_departmentId_fkey'
  ) THEN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPreference_departmentId_fkey'
  ) THEN
    ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Faculty_campusId_fkey'
  ) THEN
    ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Department_facultyId_fkey'
  ) THEN
    ALTER TABLE "Department" ADD CONSTRAINT "Department_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
