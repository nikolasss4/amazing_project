# Improve Page Updates

## Summary of Changes

This document outlines the improvements made to the Improve page based on the design requirements.

### 1. Card Styling - Silver Gradient with Liquid Glass Effect

**File**: `src/ui/primitives/GlassPanel.tsx`

- Added new `variant` prop supporting `'default'` and `'silver'` options
- Implemented silver gradient background using multiple `LinearGradient` layers
- Created liquid glass effect with:
  - Gradient colors: rgba(180, 190, 200, 0.15) to rgba(120, 135, 150, 0.2)
  - Blur overlay with intensity 25
  - Subtle shimmer highlight overlay
  - Custom silver border color: rgba(200, 210, 220, 0.3)

### 2. Candlestick Chart Component

**File**: `src/features/improve/components/CandlestickChart.tsx` (NEW)

Created a beautiful simplified candlestick chart with:
- **Candlestick visualization**: 
  - Bullish (green) and bearish (red) candles
  - Wick and body rendering for price action
  - Clean, minimal design
- **Price axis**: 
  - Right-side price scale with 5 levels
  - Formatted prices (e.g., $45,000)
- **Trading pair display**: 
  - Header showing pair (e.g., BTC/USD) and timeframe (e.g., 1H)
- **Interactive features**:
  - Pinch-to-zoom gesture support (0.8x to 2x scale)
  - Expand button to toggle between 200px and 300px height
  - Grid lines for better readability
- **Mock data generation**: 
  - Generates 20 realistic candlesticks with slight upward bias
  - Proper OHLC (Open, High, Low, Close) values

### 3. Chart Section Layout Update

**File**: `src/features/improve/screens/ImproveScreen.tsx`

- Updated chart section from **65%** to **70%** of card height
- Updated bottom section from **35%** to **30%** accordingly
- Applied `variant="silver"` to both front and back card `GlassPanel` components
- Replaced `ChartView` (TradingView wrapper) with new `CandlestickChart` component
- Removed dependency on TradingView chart for cleaner, faster rendering

### 4. Background Redesign - Fog/Flame Effect

**File**: `src/features/improve/components/LiquidFireBackground.tsx`

Completely redesigned the animation from water waves to fog/flame:

**Animation System**:
- Replaced smooth sine waves with **turbulent motion**:
  - 4 turbulence phases with different speeds (5000ms, 3500ms, 2200ms, 1500ms)
  - Bezier easing curves for irregular, organic movement
  - Flickering effect (200-220ms cycles) for flame-like intensity variation

**Layer Structure** (4 layers for depth):
1. **Tertiary fog layer**: Furthest back, slowest movement, creates atmospheric depth
2. **Secondary flame layer**: Middle layer with more opacity, main body of flame
3. **Wisp layer**: Flame tips and particles, very active turbulent motion
4. **Primary flame layer**: Foreground, brightest layer with most detail

**Gradient Improvements**:
- More color stops (4-6 per gradient vs. 3-4 previously)
- Variable start/end points (x: 0.2-0.8) for asymmetry
- Transparency gradients for fog-like blending
- Enhanced atmospheric depth mask

**Visual Effect**:
- No more smooth wave-like motion
- Irregular, chaotic movement like real flames
- Layered transparency creates depth
- Flickering intensity adds realism
- Rising fog/flame aesthetic instead of water

## Visual Result

The Improve page now features:
- Premium silver cards with liquid glass shimmer
- Beautiful, simplified candlestick charts (70% of card)
- Compact scenario description and buttons (30% of card)
- Dramatic fog/flame background that rises with streak
- More professional, polished appearance

## Files Modified

1. `/mobile/src/ui/primitives/GlassPanel.tsx` - Added silver variant
2. `/mobile/src/features/improve/components/CandlestickChart.tsx` - NEW file
3. `/mobile/src/features/improve/screens/ImproveScreen.tsx` - Updated layout and imports
4. `/mobile/src/features/improve/components/LiquidFireBackground.tsx` - Complete animation redesign

## Trade Page Status

✅ Trade page remains unchanged as requested - all modifications are isolated to the Improve feature.
