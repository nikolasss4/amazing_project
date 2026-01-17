# RiskLaba Mobile

A premium React Native trading platform with liquid glass UI, gamified learning, and AI assistance.

## 🎯 Features

- **Trade Page**: Real-time charts (TradingView), pair selection, and trade execution
- **Community Page**: Leaderboards, celebrity portfolios, and social sentiment feed
- **Learn Page**: Gamified scenario-based learning with XP and streaks
- **AI Assistant**: Context-aware help with screenshot capture
- **Premium UI**: Dark mode with liquid glass panels, smooth animations, and haptic feedback

## 📁 Project Structure

```
mobile/
├── src/
│   ├── app/
│   │   ├── navigation/       # Navigation setup & custom tab bar
│   │   ├── theme/            # Design tokens & theme system
│   │   └── store/            # Zustand state management
│   ├── features/
│   │   ├── trade/            # Trading functionality
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── models/
│   │   │   └── services/
│   │   ├── community/        # Social & leaderboard features
│   │   ├── learn/            # Gamified learning
│   │   └── assistant/        # AI Assistant
│   └── ui/
│       ├── primitives/       # Base components (GlassPanel, Button)
│       └── components/       # Composite components (Card, Pill)
├── App.tsx                   # App entry point
├── package.json
└── README.md
```

## 🛠 Tech Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript (strict mode)
- **Navigation**: React Navigation
- **State**: Zustand
- **Animations**: Reanimated 3 + Gesture Handler
- **Blur**: Expo Blur
- **Charts**: TradingView (WebView)
- **Screenshots**: react-native-view-shot

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Xcode 15+ (for iOS development)
- iOS Simulator or physical iPhone

### Installation Steps

1. **Install dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Start Expo**
   ```bash
   npm start
   ```

3. **Run on iOS**
   ```bash
   # Press 'i' in the terminal, or:
   npm run ios
   ```

4. **Run on Android** (optional)
   ```bash
   npm run android
   ```

## 📱 Running on iOS

### Using Simulator

```bash
npm run ios
```

This will automatically:
- Build the app
- Launch iOS Simulator
- Install and run the app

### Using Physical Device

1. Install Expo Go app from App Store
2. Run `npm start`
3. Scan QR code with Camera app
4. App opens in Expo Go

## 🎨 Design System

### Liquid Glass Theme

The app uses a "liquid glass" design language:

- **Base**: Pure black background (#000000)
- **Glass panels**: Frosted blur with semi-transparent dark overlay
- **Borders**: Subtle 1px white borders (10% opacity)
- **Highlights**: Inner glow effects on interactive elements
- **Shadows**: Minimal, only for depth

### Colors

- Accent: `#3B82F6` (Blue)
- Success/Bullish: `#10B981` (Green)
- Error/Bearish: `#EF4444` (Red)
- Warning: `#F59E0B` (Amber)

### Typography

- **Sizes**: xs(12), sm(14), md(16), lg(18), xl(24), xxl(32), xxxl(48)
- **Weights**: regular(400), medium(500), semibold(600), bold(700)

### Spacing Scale

4, 8, 12, 16, 24, 32, 48

## 🧩 Key Components

### GlassPanel
```tsx
import { GlassPanel } from '@ui/primitives/GlassPanel';

<GlassPanel intensity={20} tint="dark">
  <Text>Content here</Text>
</GlassPanel>
```

### Button
```tsx
import { Button } from '@ui/primitives/Button';

<Button
  variant="primary" // primary | secondary | ghost | success | error
  size="md"        // sm | md | lg
  onPress={handlePress}
>
  Press Me
</Button>
```

### Card
```tsx
import { Card } from '@ui/components/Card';

<Card onPress={() => console.log('Pressed')}>
  <Text>Card content</Text>
</Card>
```

## 🔌 API Integration

### Backend Endpoints (TODO)

The app is currently using mock data. To connect to a real backend:

1. **Update AssistantService** (`src/features/assistant/services/AssistantService.ts`)
   - Replace `query()` method with `queryReal()` implementation
   - Set API endpoint and authentication

2. **Trading API** (TODO)
   - Endpoint: `POST /api/trades`
   - Implement in `src/features/trade/services/`

3. **Community API** (TODO)
   - Endpoints: `/api/leaderboard`, `/api/celebrity-portfolios`, `/api/social-feed`
   - Implement in `src/features/community/services/`

4. **Learning API** (TODO)
   - Endpoint: `/api/scenarios`
   - Implement in `src/features/learn/services/`

### Environment Variables

Create `.env` file in mobile root:

```env
API_BASE_URL=https://api.risklaba.com
API_KEY=your_api_key_here
ASSISTANT_API_URL=https://api.risklaba.com/assistant
```

## 🤖 AI Assistant

The AI Assistant captures screenshots and provides context-aware help.

**How it works:**
1. User taps AI button in bottom right
2. App captures screenshot of current view
3. User types question
4. Screenshot + question sent to backend
5. AI responds with contextual guidance

**Mock Implementation:**
- Currently uses keyword matching
- Replace `AssistantService.query()` with real API call
- Screenshot is captured but not sent (add backend integration)

## 🎮 State Management

Using Zustand for lightweight state management:

- **useTradeStore**: Trading pairs, order state
- **useLearnStore**: XP, streaks, current scenario
- **useAssistantStore**: Chat messages, screenshot

Example:
```tsx
import { useTradeStore } from '@app/store';

const { selectedPair, setSelectedPair } = useTradeStore();
```

## 📊 Charts

TradingView charts are embedded via WebView. To customize:

1. Edit `src/features/trade/components/TradingViewChart.tsx`
2. Modify widget parameters in HTML template
3. Chart data is pulled from TradingView's servers (no API key needed for basic charts)

To swap chart provider:
- Replace `TradingViewChart` component
- Keep same props interface (`symbol`, `interval`)
- Update imports in `TradeScreen.tsx`

## 🎯 Navigation

Custom bottom navigation with two pill bubbles:

- **Left pill**: Trade, Community, Learn tabs
- **Right pill**: AI Assistant button

Implementation in `src/app/navigation/CustomTabBar.tsx`

## ✅ Quality Checklist

- [x] TypeScript strict mode
- [x] iOS optimized (simulator tested)
- [x] Dark mode default
- [x] Liquid glass UI system
- [x] Smooth animations (60fps target)
- [x] Haptic feedback
- [x] One-handed UX
- [x] Mock data for all features
- [x] Clean architecture (features isolated)
- [x] Reusable components

## 🐛 Known Issues / TODOs

- [ ] Connect to real backend APIs
- [ ] Implement actual trade execution
- [ ] Add authentication/user accounts
- [ ] Persist Learn progress (AsyncStorage or backend)
- [ ] Add error boundaries
- [ ] Implement push notifications
- [ ] Add Android-specific optimizations
- [ ] Accessibility improvements (VoiceOver/TalkBack)
- [ ] Unit & integration tests

## 📝 Development Notes

### Adding New Features

1. Create feature folder in `src/features/`
2. Add models, screens, components, services
3. Update navigation if needed
4. Add state management if needed
5. Follow liquid glass design patterns

### Styling Guidelines

- Use theme tokens (don't hardcode colors/spacing)
- All interactive elements need press animations
- Add haptic feedback for important actions
- Maintain consistent border radius and blur intensity
- Test in both light and dark environments (though app is dark-first)

### Performance Tips

- Use `React.memo()` for expensive components
- Memoize callbacks with `useCallback`
- Optimize FlatList with `getItemLayout`
- Minimize reanimated worklet complexity
- Profile with React DevTools

## 🏗 Architecture Decisions

### Why Expo?

- Faster iOS setup
- Built-in blur, haptics, linear gradient
- Easier screenshot capture
- Good for MVP, can eject if needed

### Why Zustand over Redux?

- Simpler API
- Less boilerplate
- Good TypeScript support
- Sufficient for app complexity
- Easy to migrate to Redux later if needed

### Why TradingView WebView?

- Professional charts without building custom
- Real-time data included
- Mobile-optimized
- Can be replaced with custom charts later

## 📄 License

Proprietary - RiskLaba

## 👥 Contact

For questions or issues, contact the development team.

---

**Built with ❤️ for iOS-first trading**
