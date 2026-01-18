# QR Friend System Documentation

## MVP Implementation (Current)

### QR Code Format
```
risklaba:friend:<userId>
```

**Example:**
```
risklaba:friend:11111111-1111-1111-1111-111111111111
```

### Flow
```
┌─────────────────────────────────────────────────┐
│ 1. User A taps "Add Friend" (QR icon)          │
│    ↓                                            │
│ 2. App generates & shows QR code               │
│    Format: risklaba:friend:<userA_id>          │
│    ↓                                            │
│ 3. User B scans QR code with camera            │
│    ↓                                            │
│ 4. User B's app calls:                         │
│    POST /friends/qr/resolve                    │
│    Body: { qrData: "risklaba:friend:..." }    │
│    Headers: { x-user-id: userB_id }            │
│    ↓                                            │
│ 5. Backend:                                     │
│    - Decodes userId from QR                    │
│    - Validates user exists                     │
│    - Checks not self-add                       │
│    - Checks not duplicate                      │
│    - Creates bidirectional friendship          │
│      • Friendship(userB → userA)               │
│      • Friendship(userA → userB)               │
│    ↓                                            │
│ 6. ✅ Success! Friends added instantly         │
│    - No approval needed                        │
│    - No waiting                                │
│    - No friction                               │
└─────────────────────────────────────────────────┘
```

### API Endpoints

#### Resolve QR & Add Friend
```http
POST /api/v1/friends/qr/resolve
Headers: {
  "x-user-id": "<scanning-user-id>",
  "Content-Type": "application/json"
}
Body: {
  "qrData": "risklaba:friend:<target-user-id>"
}

Response 200:
{
  "success": true,
  "friendId": "11111111-1111-1111-1111-111111111111",
  "username": "alice"
}

Response 400:
{
  "error": "Cannot add yourself as friend"
}
```

#### Get Friends List
```http
GET /api/v1/friends
Headers: {
  "x-user-id": "<user-id>"
}

Response 200:
{
  "friends": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "username": "bob",
      "addedAt": "2026-01-17T20:06:48.286Z"
    }
  ]
}
```

### Database Schema (Current)

```sql
-- Friendship table (bidirectional)
CREATE TABLE Friendship (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  friendId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(userId, friendId),
  
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (friendId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_friendship_user ON Friendship(userId);
CREATE INDEX idx_friendship_friend ON Friendship(friendId);
```

### Security Features (MVP)
- ✅ UUID validation
- ✅ User existence check
- ✅ Self-add prevention
- ✅ Duplicate prevention
- ✅ Bidirectional consistency

---

## V2 Enhancement (Token-Based)

### QR Code Format (Future)
```
qr:<random_token>
```

**Example:**
```
qr:a8f3k9d2-b7c4-45e1-9f2a-1b3c4d5e6f7g
```

### New Table
```sql
CREATE TABLE qr_tokens (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX idx_qr_tokens_user ON qr_tokens(user_id);
CREATE INDEX idx_qr_tokens_expires ON qr_tokens(expires_at);
```

### V2 Flow
```
1. User generates QR
   ↓
2. Backend creates random token
   INSERT INTO qr_tokens (token, user_id, expires_at)
   VALUES (random_uuid(), user_id, NOW() + INTERVAL '24 hours')
   ↓
3. QR shows: qr:<token>
   ↓
4. Other user scans
   ↓
5. Backend resolves:
   SELECT user_id FROM qr_tokens
   WHERE token = ? AND expires_at > NOW()
   ↓
6. Add friend (same as MVP)
   ↓
7. Optionally invalidate token (one-time use)
   DELETE FROM qr_tokens WHERE token = ?
```

### V2 Benefits
- 🔒 **Security**: User ID not exposed in QR
- ⏰ **Expiration**: Tokens can expire
- 🔄 **Revocation**: Tokens can be invalidated
- 🔢 **One-time use**: Optional single-use tokens
- 📊 **Analytics**: Track QR scan metrics

### V2 Migration Path
```typescript
// V2 can support both formats:
function decodeQRCode(qrData: string): QRData | null {
  // V2 format: qr:<token>
  if (qrData.startsWith('qr:')) {
    const token = qrData.substring(3);
    const user = await resolveToken(token);
    return { type: 'friend', userId: user.id };
  }
  
  // V1 format (backward compatible): risklaba:friend:<userId>
  if (qrData.startsWith('risklaba:friend:')) {
    const userId = qrData.substring(16);
    return { type: 'friend', userId };
  }
  
  return null;
}
```

---

## Testing

### Test QR Generation
```bash
# Generate QR for Alice
QR_DATA="risklaba:friend:11111111-1111-1111-1111-111111111111"
echo $QR_DATA
```

### Test QR Scan & Add
```bash
# Bob scans Alice's QR
curl -X POST http://localhost:3000/api/v1/friends/qr/resolve \
  -H "Content-Type: application/json" \
  -H "x-user-id: 22222222-2222-2222-2222-222222222222" \
  -d '{
    "qrData": "risklaba:friend:11111111-1111-1111-1111-111111111111"
  }'

# Response:
# {
#   "success": true,
#   "friendId": "11111111-1111-1111-1111-111111111111",
#   "username": "alice"
# }
```

### Verify Friendship
```bash
# Check Bob's friends
curl http://localhost:3000/api/v1/friends \
  -H "x-user-id: 22222222-2222-2222-2222-222222222222"

# Check Alice's friends (should be bidirectional)
curl http://localhost:3000/api/v1/friends \
  -H "x-user-id: 11111111-1111-1111-1111-111111111111"
```

---

## Frontend Integration

### Generate QR (QRCodeModal.tsx)
```typescript
const qrData = `risklaba:friend:${userId}`;

<QRCode
  value={qrData}
  size={240}
  backgroundColor="white"
  color="black"
/>
```

### Scan QR (QRScannerModal.tsx)
```typescript
const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
  // data = "risklaba:friend:11111111-1111-1111-1111-111111111111"
  
  const result = await CommunityService.addFriendViaQR(userId, data);
  
  if (result.success) {
    Alert.alert('Success', `Added ${result.username} as a friend!`);
  }
};
```

---

## Summary

### ✅ MVP (Current)
- Direct userId encoding
- Single API call (`/friends/qr/resolve`)
- No friction, no approvals
- Instant friend addition
- Bidirectional friendships

### 🚀 V2 (Future)
- Token-based system
- Enhanced security
- Token expiration
- Revocation support
- Analytics capabilities

**Status: MVP Complete & Working** 🎉

