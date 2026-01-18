import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  PressableProps,
  ViewStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@app/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'error';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Button - Animated button with liquid glass styling
 * Variants: Primary (luminous), Secondary (glass), Ghost (transparent)
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  fullWidth = false,
  disabled,
  onPress,
  style,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    // Safe haptic call - no-op on web
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Silently fail if haptics are not available
      }
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = (e: any) => {
    if (onPress && !disabled && !loading) {
      // Safe haptic call - no-op on web
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
          // Silently fail if haptics are not available
        }
      }
      onPress(e);
    }
  };

  // Get accessible label from children if it's a string
  const accessibleLabel = typeof children === 'string' ? children : undefined;

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={loading && loadingText ? loadingText : accessibleLabel}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        animatedStyle,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <>
          <ActivityIndicator
            color={variant === 'primary' ? '#FFF' : theme.colors.accent}
            style={loadingText ? styles.loadingSpinner : undefined}
          />
          {loadingText && (
            <Text style={[styles.text, styles[`text_${size}`], styles[`text_${variant}`]]}>
              {loadingText}
            </Text>
          )}
        </>
      ) : typeof children === 'string' ? (
        <Text style={[styles.text, styles[`text_${size}`], styles[`text_${variant}`]]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  // Variants
  primary: {
    backgroundColor: theme.colors.accent,
    ...theme.shadows.glow,
  },
  secondary: {
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  success: {
    backgroundColor: theme.colors.success,
  },
  error: {
    backgroundColor: theme.colors.error,
  },
  // Sizes
  sm: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    minHeight: 56,
  },
  // States
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  loadingSpinner: {
    marginRight: theme.spacing.sm,
  },
  // Text
  text: {
    fontWeight: theme.typography.weights.semibold,
    textAlign: 'center',
  },
  text_sm: {
    fontSize: theme.typography.sizes.sm,
  },
  text_md: {
    fontSize: theme.typography.sizes.md,
  },
  text_lg: {
    fontSize: theme.typography.sizes.lg,
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: theme.colors.textPrimary,
  },
  text_ghost: {
    color: theme.colors.accent,
  },
  text_success: {
    color: '#FFFFFF',
  },
  text_error: {
    color: '#FFFFFF',
  },
});
