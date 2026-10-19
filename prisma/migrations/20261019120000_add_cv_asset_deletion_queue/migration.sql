CREATE TABLE "CvAssetDeletion" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvAssetDeletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CvAssetDeletion_publicId_key" ON "CvAssetDeletion"("publicId");
CREATE INDEX "CvAssetDeletion_nextAttemptAt_createdAt_idx" ON "CvAssetDeletion"("nextAttemptAt", "createdAt");
