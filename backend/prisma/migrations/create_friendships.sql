-- SQL Schema for Friendships Table
-- This is the raw SQL equivalent of the Prisma schema
-- Prisma migrations will generate similar SQL automatically

-- Create friendships table
CREATE TABLE IF NOT EXISTS "Friendship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Friendship_userId_friendId_key" UNIQUE ("userId", "friendId"),
    CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "no_self_friendship" CHECK ("userId" != "friendId")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Friendship_userId_idx" ON "Friendship"("userId");
CREATE INDEX IF NOT EXISTS "Friendship_friendId_idx" ON "Friendship"("friendId");

-- Note: This table stores bidirectional friendships
-- When user A adds user B, we create two records:
-- 1. (userId=A, friendId=B)
-- 2. (userId=B, friendId=A)
-- This allows efficient querying from either direction

