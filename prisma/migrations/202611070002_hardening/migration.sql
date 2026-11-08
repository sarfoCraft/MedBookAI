ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';

ALTER TABLE "Organization"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

ALTER TABLE "User"
  ADD COLUMN "providerName" TEXT,
  ADD COLUMN "branch" TEXT;

ALTER TABLE "AuditEvent"
  ADD COLUMN "actorRole" TEXT,
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "previousValues" JSONB,
  ADD COLUMN "newValues" JSONB;

CREATE INDEX "User_organizationId_branch_idx" ON "User"("organizationId", "branch");
CREATE INDEX "User_organizationId_providerName_idx" ON "User"("organizationId", "providerName");
CREATE INDEX "AuditEvent_resource_idx" ON "AuditEvent"("organizationId", "resourceType", "resourceId", "createdAt");

-- Application audit events are append-only. FK cascade actions are allowed so an
-- explicitly deleted tenant can still be removed; direct application UPDATE/DELETE is blocked.
CREATE OR REPLACE FUNCTION medbook_prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AuditEvent records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION medbook_prevent_audit_mutation();
