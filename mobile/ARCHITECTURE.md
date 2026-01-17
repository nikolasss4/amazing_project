# RiskLaba Mobile - Architecture Overview

## 📐 Architecture Philosophy

This app follows a **feature-based architecture** with clear separation of concerns. Each feature is self-contained with its own screens, components, models, and services.

## 🏗 Folder Structure

```
mobile/
│
├── src/
│   │
│   ├── app/                          # App-level concerns
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx     # Main navigation setup
│   │   │   └── CustomTabBar.tsx      # Telegram-style bottom bar
│   │   │
│   │   ├── theme/
│   │   │   ├── tokens.ts             # Design tokens (colors, spacing, etc.)
│   │   │   └── index.ts
│   │   │
│   │   └── store/
│   │       └── index.ts              # Zustand stores (Trade, Learn, Assistant)
│   │
│   ├── features/                     # Feature modules
│   │   │
│   │   ├── trade/                    # Trading feature
│   │   │   ├── screens/
│   │   │   │   └── TradeScreen.tsx
│   │   │   ├── components/
│   │   │   │   └── TradingViewChart.tsx
│   │   │   ├── models/
│   │   │   │   └── index.ts         # TradePair, TradeOrder types
│   │   │   └── services/            # (TODO: API services)
│   │   │
│   │   ├── community/               # Social & leaderboard feature
│   │   │   ├── screens/
│   │   │   │   └── CommunityScreen.tsx
│   │   │   ├── components/          # (Future: reusable community components)
│   │   │   ├── models/
│   │   │   │   └── index.ts         # Leaderboard, Portfolio, Post types
│   │   │   └── services/            # (TODO: API services)
│   │   │
│   │   ├── learn/                   # Gamified learning feature
│   │   │   ├── screens/
│   │   │   │   └── LearnScreen.tsx
│   │   │   ├── components/          # (Future: ScenarioCard component)
│   │   │   ├── models/
│   │   │   │   └── index.ts         # Scenario types
│   │   │   └── services/            # (TODO: API services)
│   │   │
│   │   └── assistant/               # AI Assistant feature
│   │       ├── components/
│   │       │   └── AssistantOverlay.tsx
│   │       ├── services/
│   │       │   └── AssistantService.ts
│   │       └── models/              # (Types defined in store)
│   │
│   └── ui/                          # Shared UI components
│       │
│       ├── primitives/              # Base building blocks
│       │   ├── GlassPanel.tsx       # Liquid glass container
│       │   ├── Button.tsx           # Animated button with variants
│       │   └── index.ts
│       │
│       └── components/              # Composite components
│           ├── Card.tsx             # Pressable glass card
│           ├── Pill.tsx             # Tag/badge component
│           └── index.ts
│
├── App.tsx                          # App entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── babel.config.js                  # Babel config (Reanimated plugin)
└── README.md                        # Setup & documentation
```

## 🎯 Design Patterns

### 1. Feature Modules

Each feature is organized as:
```
feature/
  ├── screens/       # Full-page screens
  ├── components/    # Feature-specific components
  ├── models/        # TypeScript types & mock data
  └── services/      # API calls & business logic
```

**Benefits:**
- Easy to locate related code
- Clear boundaries between features
- Can be extracted to separate packages if needed

### 2. Atomic Design for UI

**Primitives** (atoms):
- `GlassPanel`, `Button`
- No business logic
- Highly reusable
- Accept style props

**Components** (molecules):
- `Card`, `Pill`
- Combine primitives
- Minimal logic
- Still reusable across features

**Feature Components** (organisms):
- `TradingViewChart`, `AssistantOverlay`
- Feature-specific
- Can contain business logic
- Use primitives & components

### 3. State Management Strategy

**Zustand stores** for:
- Cross-feature state (Assistant messages)
- Persistent state (Learn XP, streaks)
- Complex state (Trade selections)

**Local state** for:
- UI state (modals, toggles)
- Form inputs
- Temporary state

**When to create a new store:**
- State needed by multiple features
- State that persists between sessions
- Complex state with multiple actions

### 4. Service Layer Pattern

Services handle:
- API calls
- Data transformations
- Error handling
- Retry logic

Example:
```typescript
// services/AssistantService.ts
class AssistantServiceClass {
  async query(request: AssistantQueryRequest): Promise<AssistantQueryResponse> {
    // Mock for now, replace with real API
  }
}

export const AssistantService = new AssistantServiceClass();
```

## 🎨 Theme Architecture

### Design Tokens

All visual constants live in `app/theme/tokens.ts`:

```typescript
export const colors = { /* ... */ };
export const spacing = { /* ... */ };
export const borderRadius = { /* ... */ };
export const typography = { /* ... */ };
export const shadows = { /* ... */ };
export const animations = { /* ... */ };
```

**Never hardcode values.** Always use theme tokens:
```tsx
// ❌ Bad
<View style={{ backgroundColor: '#1a1a1a', padding: 16 }} />

// ✅ Good
<View style={{
  backgroundColor: theme.colors.glassBackground,
  padding: theme.spacing.lg
}} />
```

### Liquid Glass System

All panels use consistent glass styling:
1. Blur background (expo-blur)
2. Semi-transparent overlay
3. Subtle border (1px, 10% white)
4. Rounded corners (12-24px)
5. Optional highlight gradient

Implemented in `GlassPanel` component.

## 🚦 Navigation Flow

```
App.tsx
  └─ RootNavigator (Bottom Tabs)
      ├─ Trade Tab → TradeScreen
      ├─ Community Tab → CommunityScreen
      └─ Learn Tab → LearnScreen

AssistantOverlay (Global Modal)
  └─ Triggered by bottom-right AI button
```

Custom tab bar (`CustomTabBar.tsx`) renders:
- Left pill: 3 tab icons
- Right pill: AI button

## 📡 Data Flow

### Trading Flow
```
User selects pair
  → TradeStore.setSelectedPair()
  → TradeScreen updates
  → TradingViewChart re-renders with new symbol

User places order
  → TradeScreen.handlePlaceTrade()
  → (TODO) TradeService.submitOrder()
  → Success modal shown
  → State cleared
```

### Learning Flow
```
Scenario displayed
  → User selects answer
  → Card flips (Reanimated)
  → LearnStore.addXP()
  → LearnStore.incrementStreak()
  → Next scenario loaded
```

### AI Assistant Flow
```
User opens assistant
  → Capture screenshot (view-shot)
  → AssistantStore.setScreenshot()
  → AssistantOverlay opens

User sends message
  → AssistantStore.addMessage(user)
  → AssistantService.query()
  → AssistantStore.addMessage(assistant)
```

## 🔌 API Integration Points

### Current State: Mock Data

All features use mock data defined in `models/index.ts` files.

### Migration Path to Real Backend

**Step 1**: Create service files
```typescript
// features/trade/services/TradeService.ts
export class TradeService {
  async submitOrder(order: TradeOrder): Promise<TradeResponse> {
    // Real API call
  }
}
```

**Step 2**: Update screens to use services
```typescript
// Before
setShowSuccess(true);

// After
const response = await TradeService.submitOrder(order);
if (response.success) setShowSuccess(true);
```

**Step 3**: Add error handling
```typescript
try {
  await TradeService.submitOrder(order);
} catch (error) {
  showErrorModal(error.message);
}
```

### Recommended API Structure

```
POST /api/v1/trades          # Submit trade order
GET  /api/v1/pairs           # Get available trading pairs
GET  /api/v1/leaderboard     # Get leaderboard data
GET  /api/v1/portfolios      # Celebrity portfolios
GET  /api/v1/social-feed     # Social posts
GET  /api/v1/scenarios       # Learning scenarios
POST /api/v1/assistant/query # AI assistant query
```

## 🎭 Animation Strategy

### Reanimated Worklets

Use for:
- Gesture-driven animations
- 60fps animations
- Complex interpolations

Examples:
- Button press scale
- Card flip (Learn screen)
- Custom tab bar icon scaling

### Animated API

Use for:
- Simple fade in/out
- Layout animations
- Entrance animations

Examples:
- Modal overlays
- Screen transitions
- Success notifications

### Performance Guidelines

1. Keep worklets simple
2. Avoid heavy computations in animations
3. Use `runOnJS` for side effects
4. Profile with React DevTools
5. Test on physical device (simulator is faster)

## 🧪 Testing Strategy (TODO)

### Unit Tests
- Utility functions
- Service layer
- State stores

### Component Tests
- UI primitives render correctly
- Interactions work (press, input)
- Accessibility

### Integration Tests
- Feature flows work end-to-end
- Navigation works
- State updates correctly

### E2E Tests
- Critical user journeys
- Trade placement
- Learning flow
- AI assistant interaction

## 🔐 Security Considerations

### Current MVP
- No authentication
- Mock data only
- No sensitive operations

### Production Requirements
- [ ] Implement authentication (JWT/OAuth)
- [ ] Secure API keys (not in code)
- [ ] Validate all user inputs
- [ ] Encrypt sensitive data
- [ ] Add rate limiting
- [ ] Implement proper error messages (don't leak info)
- [ ] Add SSL pinning for API calls
- [ ] Secure storage for tokens (Keychain/Keystore)

## 📈 Scalability Considerations

### Current App Size
- ~50 screens/components
- 3 main features
- Lightweight state

### Growth Path

**Phase 1** (Current MVP):
- Mock data
- Basic features
- No backend

**Phase 2** (API Integration):
- Connect to backend
- Real-time data
- User accounts

**Phase 3** (Advanced Features):
- Portfolio tracking
- Notifications
- Advanced analytics
- Social features

**Phase 4** (Scale):
- Code splitting
- Lazy loading
- Performance optimization
- Analytics & monitoring

### When to Refactor

Consider refactoring when:
- File >500 lines
- Component >300 lines
- Too much prop drilling (add context/store)
- Repeated code (extract utility/hook)
- Slow renders (memoize/optimize)

## 🎓 Learning Resources

### React Native
- [Official Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)

### Reanimated
- [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)

### Navigation
- [React Navigation](https://reactnavigation.org/)

### State Management
- [Zustand Docs](https://docs.pmnd.rs/zustand/)

---

**This architecture is designed to scale from MVP to production while maintaining code quality and developer experience.**
