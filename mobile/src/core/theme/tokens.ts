/**
 * Design Tokens - Liquid Glass Theme
 * Dark mode with frosted blur, subtle borders, and specular highlights
 */

export const colors = {
  // Base
  background: '#000000',
  backgroundElevated: '#0A0A0A',

  // Glass overlays
  glassBackground: 'rgba(18, 18, 18, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.4)',

  // Accent
  accent: '#3B82F6', // Blue
  accentHover: '#2563EB',
  accentMuted: 'rgba(59, 130, 246, 0.2)',

  // Success/Error/Warning
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.2)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.2)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.2)',

  // Trading specific
  bullish: '#10B981',
  bearish: '#EF4444',
  neutral: '#6B7280',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.8)',

  // Fire/streak gradients - Green
  fireGreen: '#10B981',
  fireGreenMid: '#059669',
  fireGreenDark: '#047857',
  fireGreenDeep: '#064E3B',

  // Fire/streak gradients - Red (incorrect)
  fireRed: '#EF4444',
  fireRedMid: '#DC2626',
  fireRedDark: '#B91C1C',
  fireRedDeep: '#7F1D1D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    standard: 'ease-in-out',
    decelerate: 'ease-out',
    accelerate: 'ease-in',
  },
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  animations,
} as const;

export type Theme = typeof theme;
