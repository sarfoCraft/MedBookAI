-- Firebase Authentication is the identity provider; Prisma/PostgreSQL remains the application database.
-- Existing bcrypt accounts remain valid until individually linked or migrated.
ALTER TABLE "User"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN "firebaseUid" TEXT;

CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
