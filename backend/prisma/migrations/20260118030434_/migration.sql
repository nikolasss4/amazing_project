-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "profileMetadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "returnPercent" REAL NOT NULL,
    "winRate" REAL NOT NULL,
    "tradesCount" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Narrative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerValue" TEXT,
    "sentiment" TEXT NOT NULL,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "velocity" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NarrativeAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT NOT NULL,
    "assetSymbol" TEXT NOT NULL,
    "impact" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NarrativeAsset_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "Narrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT NOT NULL,
    "eventTime" DATETIME NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NarrativeEvent_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "Narrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SocialPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostTicker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    CONSTRAINT "PostTicker_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackedAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL DEFAULT 'twitter',
    "accountHandle" TEXT NOT NULL,
    "accountName" TEXT,
    "accountType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IngestedPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackedAccountId" TEXT NOT NULL,
    "externalPostId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL,
    "engagementLikes" INTEGER NOT NULL DEFAULT 0,
    "engagementRetweets" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT NOT NULL,
    "tickers" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "narrativeId" TEXT,
    "ingestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IngestedPost_trackedAccountId_fkey" FOREIGN KEY ("trackedAccountId") REFERENCES "TrackedAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IngestedPost_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "Narrative" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityPulse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT,
    "bullishPercent" REAL NOT NULL,
    "bearishPercent" REAL NOT NULL,
    "neutralPercent" REAL NOT NULL,
    "discussionCount" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    CONSTRAINT "CommunityPulse_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "Narrative" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArticleEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DetectedNarrative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL DEFAULT 'neutral',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketMessage_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "DetectedNarrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeFollower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "narrativeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NarrativeFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NarrativeFollower_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "DetectedNarrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "mentionCount" INTEGER NOT NULL,
    "velocity" REAL NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NarrativeMetric_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "DetectedNarrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetectedNarrativeArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "narrativeId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DetectedNarrativeArticle_narrativeId_fkey" FOREIGN KEY ("narrativeId") REFERENCES "DetectedNarrative" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "authorHandle" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "engagement" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "url" TEXT,
    "postId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "Friendship_userId_idx" ON "Friendship"("userId");

-- CreateIndex
CREATE INDEX "Friendship_friendId_idx" ON "Friendship"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userId_friendId_key" ON "Friendship"("userId", "friendId");

-- CreateIndex
CREATE INDEX "UserMetric_userId_period_idx" ON "UserMetric"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "UserMetric_userId_period_key" ON "UserMetric"("userId", "period");

-- CreateIndex
CREATE INDEX "Narrative_status_idx" ON "Narrative"("status");

-- CreateIndex
CREATE INDEX "Narrative_sentiment_idx" ON "Narrative"("sentiment");

-- CreateIndex
CREATE INDEX "NarrativeAsset_narrativeId_idx" ON "NarrativeAsset"("narrativeId");

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeAsset_narrativeId_assetSymbol_key" ON "NarrativeAsset"("narrativeId", "assetSymbol");

-- CreateIndex
CREATE INDEX "NarrativeEvent_narrativeId_idx" ON "NarrativeEvent"("narrativeId");

-- CreateIndex
CREATE INDEX "SocialPost_userId_idx" ON "SocialPost"("userId");

-- CreateIndex
CREATE INDEX "SocialPost_sentiment_idx" ON "SocialPost"("sentiment");

-- CreateIndex
CREATE INDEX "PostTicker_postId_idx" ON "PostTicker"("postId");

-- CreateIndex
CREATE INDEX "PostTicker_ticker_idx" ON "PostTicker"("ticker");

-- CreateIndex
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedAccount_accountHandle_key" ON "TrackedAccount"("accountHandle");

-- CreateIndex
CREATE INDEX "TrackedAccount_isActive_platform_idx" ON "TrackedAccount"("isActive", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "IngestedPost_externalPostId_key" ON "IngestedPost"("externalPostId");

-- CreateIndex
CREATE INDEX "IngestedPost_trackedAccountId_idx" ON "IngestedPost"("trackedAccountId");

-- CreateIndex
CREATE INDEX "IngestedPost_narrativeId_idx" ON "IngestedPost"("narrativeId");

-- CreateIndex
CREATE INDEX "CommunityPulse_narrativeId_idx" ON "CommunityPulse"("narrativeId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_url_key" ON "NewsArticle"("url");

-- CreateIndex
CREATE INDEX "NewsArticle_source_idx" ON "NewsArticle"("source");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_createdAt_idx" ON "NewsArticle"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_name_key" ON "NewsSource"("name");

-- CreateIndex
CREATE INDEX "NewsSource_active_idx" ON "NewsSource"("active");

-- CreateIndex
CREATE INDEX "NewsSource_category_idx" ON "NewsSource"("category");

-- CreateIndex
CREATE INDEX "ArticleEntity_articleId_idx" ON "ArticleEntity"("articleId");

-- CreateIndex
CREATE INDEX "ArticleEntity_type_idx" ON "ArticleEntity"("type");

-- CreateIndex
CREATE INDEX "ArticleEntity_entity_idx" ON "ArticleEntity"("entity");

-- CreateIndex
CREATE INDEX "DetectedNarrative_createdAt_idx" ON "DetectedNarrative"("createdAt");

-- CreateIndex
CREATE INDEX "DetectedNarrative_sentiment_idx" ON "DetectedNarrative"("sentiment");

-- CreateIndex
CREATE INDEX "MarketMessage_narrativeId_createdAt_idx" ON "MarketMessage"("narrativeId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketMessage_userId_idx" ON "MarketMessage"("userId");

-- CreateIndex
CREATE INDEX "NarrativeFollower_userId_idx" ON "NarrativeFollower"("userId");

-- CreateIndex
CREATE INDEX "NarrativeFollower_narrativeId_idx" ON "NarrativeFollower"("narrativeId");

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeFollower_userId_narrativeId_key" ON "NarrativeFollower"("userId", "narrativeId");

-- CreateIndex
CREATE INDEX "NarrativeMetric_narrativeId_idx" ON "NarrativeMetric"("narrativeId");

-- CreateIndex
CREATE INDEX "NarrativeMetric_period_idx" ON "NarrativeMetric"("period");

-- CreateIndex
CREATE INDEX "NarrativeMetric_calculatedAt_idx" ON "NarrativeMetric"("calculatedAt");

-- CreateIndex
CREATE INDEX "DetectedNarrativeArticle_narrativeId_idx" ON "DetectedNarrativeArticle"("narrativeId");

-- CreateIndex
CREATE INDEX "DetectedNarrativeArticle_articleId_idx" ON "DetectedNarrativeArticle"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "DetectedNarrativeArticle_narrativeId_articleId_key" ON "DetectedNarrativeArticle"("narrativeId", "articleId");

-- CreateIndex
CREATE INDEX "ExternalPost_platform_idx" ON "ExternalPost"("platform");

-- CreateIndex
CREATE INDEX "ExternalPost_authorHandle_idx" ON "ExternalPost"("authorHandle");

-- CreateIndex
CREATE INDEX "ExternalPost_publishedAt_idx" ON "ExternalPost"("publishedAt");

-- CreateIndex
CREATE INDEX "ExternalPost_createdAt_idx" ON "ExternalPost"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPost_platform_postId_key" ON "ExternalPost"("platform", "postId");
