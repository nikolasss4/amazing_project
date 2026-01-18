# Friend System Implementation

## Overview

Symmetric friend system with QR code support. Friendships are bidirectional and auto-added on QR scan (no friend requests).

## Data Model

### SQL Schema

```sql
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE ("userId", "friendId"),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE,
    CHECK ("userId" != "friendId") -- Prevent self-add at DB level
);

CREATE INDEX "Friendship_userId_idx" ON "Friendship"("userId");
CREATE INDEX "Friendship_friendId_idx" ON "Friendship"("friendId");
```

See `prisma/migrations/create_friendships.sql` for full SQL.

### Prisma Schema

```prisma
model Friendship {
  id        String   @id @default(uuid())
  userId    String
  friendId  String
  createdAt DateTime @default(now())

  user   User @relation("UserFriendships", fields: [userId], references: [id], onDelete: Cascade)
  friend User @relation("FriendFriendships", fields: [friendId], references: [id], onDelete: Cascade)

  @@unique([userId, friendId])
  @@index([userId])
  @@index([friendId])
  @@check([userId, friendId], name: "no_self_friendship", raw: "userId != friendId")
}
```

## Repository Functions

Repository layer (`src/repositories/friends.repository.ts`):

- `findUserById(userId: string)` - Find user by ID
- `friendshipExists(userId: string, friendId: string)` - Check if friendship exists
- `createBidirectionalFriendship(userId: string, friendId: string)` - Create symmetric friendship
- `getFriendsByUserId(userId: string)` - Get user's friend list
- `areFriends(userId1: string, userId2: string)` - Check if two users are friends

## Service Layer

Service layer (`src/services/friends.service.ts`):

- `resolveQRCodeAndAddFriend(userId: string, qrData: string)` - Resolve QR and add friend
- `addFriend(userId: string, friendId: string)` - Add friend by userId
- `getFriends(userId: string)` - Get friend list
- `areFriends(userId1: string, userId2: string)` - Check friendship status

## API Endpoints

### POST /api/v1/friends/add

Add friend by userId.

**Request:**
```json
{
  "friendUserId": "uuid-of-friend"
}
```

**Response:**
```json
{
  "success": true
}
```

**Validation:**
- `friendUserId` must be a valid UUID
- Cannot add yourself (self-add prevention)
- User must exist
- Duplicate friendships are prevented (idempotent)

### GET /api/v1/friends

Get user's friend list.

**Response:**
```json
{
  "friends": [
    {
      "id": "uuid",
      "username": "alice",
      "addedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/v1/friends/qr/resolve

Resolve QR code and add friend (auto-add).

**Request:**
```json
{
  "qrData": "risklaba:friend:uuid-of-friend"
}
```

**Response:**
```json
{
  "success": true,
  "friendId": "uuid",
  "username": "alice"
}
```

## QR Code Logic

QR codes encode the user's UUID:

- **Format**: `risklaba:friend:{userId}`
- **Example**: `risklaba:friend:550e8400-e29b-41d4-a716-446655440000`

**Encoding/Decoding:**
- `encodeQRCode(userId: string)` - Encode userId to QR format
- `decodeQRCode(qrData: string)` - Decode QR to userId
- Validates UUID format

**Location**: `src/utils/qr-code.ts`

## Validation

All validations are implemented:

### 1. Self-Add Prevention
- Service layer: Checks `userId === friendId`
- Database level: CHECK constraint `userId != friendId`
- Returns error: "Cannot add yourself as friend"

### 2. Duplicate Prevention
- Service layer: Checks if friendship exists before creating
- Database level: UNIQUE constraint on `(userId, friendId)`
- Idempotent: Returns success if already friends (no error)

### 3. User Existence
- Validates friend user exists before creating friendship
- Returns error: "User not found" if user doesn't exist

### 4. UUID Validation
- QR code decoding validates UUID format
- Request validation uses Zod schema with `.uuid()`

## Bidirectional Friendships

Friendships are stored as two records:

When user A adds user B:
1. `(userId=A, friendId=B)`
2. `(userId=B, friendId=A)`

This allows:
- Efficient querying from either direction
- Both users see each other in their friend lists
- No need for separate "following/followers" concepts

## Express Route Handlers

Routes (`src/routes/friends.ts`):

```typescript
// All routes require authentication via x-user-id header
router.use(authMiddleware);

// POST /api/v1/friends/add
router.post('/add', async (req, res) => {
  const { friendUserId } = addFriendSchema.parse(req.body);
  await friendsService.addFriend(userId, friendUserId);
  res.json({ success: true });
});

// GET /api/v1/friends
router.get('/', async (req, res) => {
  const friends = await friendsService.getFriends(userId);
  res.json({ friends });
});

// POST /api/v1/friends/qr/resolve
router.post('/qr/resolve', async (req, res) => {
  const { qrData } = qrResolveSchema.parse(req.body);
  const result = await friendsService.resolveQRCodeAndAddFriend(userId, qrData);
  res.json({ success: true, ...result });
});
```

## Example Usage

### Generate QR Code (Frontend)

```typescript
import { encodeQRCode } from '@/utils/qr-code';

const userId = currentUser.id;
const qrData = encodeQRCode(userId);
// qrData: "risklaba:friend:550e8400-e29b-41d4-a716-446655440000"
```

### Scan QR Code (Frontend)

```typescript
// After scanning QR code
const qrData = scannedData; // "risklaba:friend:uuid"

const response = await fetch('/api/v1/friends/qr/resolve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId,
  },
  body: JSON.stringify({ qrData }),
});
```

### Add Friend Manually

```typescript
const response = await fetch('/api/v1/friends/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId,
  },
  body: JSON.stringify({ friendUserId: 'uuid-of-friend' }),
});
```

### Get Friend List

```typescript
const response = await fetch('/api/v1/friends', {
  headers: {
    'x-user-id': currentUserId,
  },
});

const { friends } = await response.json();
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `400 Bad Request` - Invalid input (UUID format, validation errors)
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server errors

Error response format:
```json
{
  "error": "Error message",
  "details": [...] // For validation errors
}
```

## Testing

Test cases to verify:

1. ✅ Cannot add yourself as friend
2. ✅ Cannot add duplicate friends (idempotent)
3. ✅ User must exist
4. ✅ QR code format validation
5. ✅ UUID format validation
6. ✅ Bidirectional friendship creation
7. ✅ Friend list retrieval

## Database Constraints

- **PRIMARY KEY**: `id`
- **UNIQUE**: `(userId, friendId)` - Prevents duplicates
- **FOREIGN KEY**: `userId` → `User.id` (CASCADE delete)
- **FOREIGN KEY**: `friendId` → `User.id` (CASCADE delete)
- **CHECK**: `userId != friendId` - Prevents self-add
- **INDEXES**: `userId`, `friendId` - For fast queries

