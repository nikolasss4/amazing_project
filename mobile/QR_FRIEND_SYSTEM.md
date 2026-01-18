# QR Code Friend System - Frontend Integration

## What Was Implemented

### 1. Package Dependencies ✅
Updated `package.json` with:
- `react-native-qrcode-svg` - QR code generation
- `react-native-svg` - SVG support for QR codes
- `expo-camera` - Camera access for QR scanning
- `axios` - HTTP client for API calls

### 2. User Store ✅
Created `src/app/store/userStore.ts`:
- Stores current `userId` and `username`
- Used throughout the app for authentication
- MVP: Hardcoded user, production: from auth

### 3. Community Service ✅
Created `src/features/community/services/CommunityService.ts`:
- `addFriendViaQR(userId, qrData)` - Add friend by scanning QR
- `addFriend(userId, friendUserId)` - Add friend manually
- `getFriends(userId)` - Get friend list
- `getLeaderboard(userId, scope, period)` - Get leaderboard data
- Connects to backend API at `http://localhost:3000/api/v1`

### 4. QR Code Modal ✅
Updated `src/features/community/components/QRCodeModal.tsx`:
- Generates real QR codes using `react-native-qrcode-svg`
- QR format: `risklaba:friend:{userId}`
- Shows user's QR code for others to scan

### 5. QR Scanner Modal ✅
Created `src/features/community/components/QRScannerModal.tsx`:
- Uses `expo-camera` for QR code scanning
- Validates QR format before adding friend
- Shows camera view with scan frame overlay
- Handles camera permissions
- Calls backend API to add friend
- Shows success/error alerts

### 6. Community Screen Integration ✅
Updated `src/features/community/screens/CommunityScreen.tsx`:
- Integrated user store for userId/username
- Added QR scanner modal
- QR button now shows options: "Show My QR" or "Scan QR"
- Loads friends list from backend
- Added loading states and error handling

## How It Works

### User Flow

1. **Show QR Code**:
   - User taps QR icon → "Show My QR Code"
   - Modal displays QR with format: `risklaba:friend:{userId}`
   - Friend scans this QR code

2. **Scan QR Code**:
   - User taps QR icon → "Scan QR Code"
   - Camera opens with scan frame
   - User points camera at friend's QR code
   - App validates format and calls backend
   - Backend creates bidirectional friendship
   - Success alert shows: "You are now friends with @username"

3. **Behind the Scenes**:
   - QR data: `risklaba:friend:550e8400-e29b-41d4-a716-446655440000`
   - Frontend calls: `POST /api/v1/friends/qr/resolve`
   - Backend validates, prevents self-add/duplicates
   - Creates two friendship records (bidirectional)
   - Returns friend info to frontend

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
npm install
```

This installs:
- `react-native-qrcode-svg`
- `react-native-svg`
- `expo-camera`

### 2. Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:3000`

### 3. Configure API URL

For testing on physical device, update `CommunityService.ts`:

```typescript
// Change this line:
const API_BASE_URL = 'http://localhost:3000/api/v1';

// To your machine's local IP:
const API_BASE_URL = 'http://192.168.1.x:3000/api/v1';
```

### 4. Run Mobile App

```bash
cd mobile
npm run start
# Then press 'i' for iOS or 'a' for Android
```

### 5. Test QR Flow

1. Open app on Device A
2. Tap QR icon → "Show My QR Code"
3. Open app on Device B (or simulator)
4. Tap QR icon → "Scan QR Code"
5. Point camera at Device A's QR code
6. See success message: "You are now friends with @username"

## API Integration

### Authentication
- MVP uses `x-user-id` header
- Set in `CommunityService.getHeaders()`
- Production: Replace with JWT tokens

### Endpoints Used

```typescript
// Add friend via QR
POST /api/v1/friends/qr/resolve
Headers: { 'x-user-id': userId }
Body: { qrData: "risklaba:friend:uuid" }

// Add friend manually
POST /api/v1/friends/add
Headers: { 'x-user-id': userId }
Body: { friendUserId: "uuid" }

// Get friends
GET /api/v1/friends
Headers: { 'x-user-id': userId }
```

## File Structure

```
mobile/src/
├── app/
│   └── store/
│       ├── index.ts (exports userStore)
│       └── userStore.ts (NEW - userId/username state)
└── features/
    └── community/
        ├── components/
        │   ├── QRCodeModal.tsx (UPDATED - real QR generation)
        │   └── QRScannerModal.tsx (NEW - QR scanning)
        ├── services/
        │   └── CommunityService.ts (NEW - API calls)
        └── screens/
            └── CommunityScreen.tsx (UPDATED - integration)
```

## Environment Variables

Create `.env` in mobile folder (optional):

```env
API_BASE_URL=http://localhost:3000/api/v1
```

Then update `CommunityService.ts`:

```typescript
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl 
  || 'http://localhost:3000/api/v1';
```

## Testing on Simulator

For iOS Simulator testing:
- Use two simulators
- Or use one simulator + physical device
- Backend should be running on your machine

## Troubleshomarks

### "Cannot connect to server"
- Check backend is running: `curl http://localhost:3000/health`
- For physical device, use machine's IP address
- Check firewall isn't blocking port 3000

### "Camera permission denied"
- Grant camera permission in settings
- Restart app after granting permission

### "Invalid QR Code"
- Verify QR format: `risklaba:friend:{uuid}`
- Check backend is validating UUIDs correctly

### "Cannot add yourself as friend"
- This is expected behavior
- Backend prevents self-friendship

## Production Checklist

- [ ] Replace mock userId with real authentication
- [ ] Use JWT tokens instead of `x-user-id` header
- [ ] Add error boundary for camera crashes
- [ ] Add analytics tracking for QR scans
- [ ] Implement QR code expiration (optional)
- [ ] Add loading indicators
- [ ] Handle network errors gracefully
- [ ] Add retry logic for failed requests
- [ ] Store friends list in local state/cache
- [ ] Add pull-to-refresh for friends list

## Complete!

The QR code friend system is fully implemented end-to-end:
✅ Backend API with validation
✅ Frontend QR generation
✅ Frontend QR scanning
✅ API integration
✅ User store
✅ Error handling
✅ Success feedback

Test it now by running both backend and mobile app!

