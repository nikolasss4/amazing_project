-- CreateTable
CREATE TABLE "NarrativeStance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NarrativeStance_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "DetectedNarrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NarrativeStance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeStance_userId_narrativeId_key" ON "NarrativeStance"("userId", "narrativeId");

-- CreateIndex
CREATE INDEX "NarrativeStance_narrativeId_idx" ON "NarrativeStance"("narrativeId");

-- CreateIndex
CREATE INDEX "NarrativeStance_userId_idx" ON "NarrativeStance"("userId");

-- CreateIndex
CREATE INDEX "NarrativeStance_stance_idx" ON "NarrativeStance"("stance");
