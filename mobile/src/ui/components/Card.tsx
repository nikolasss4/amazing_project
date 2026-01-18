import React from 'react';
import { Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { theme } from '@app/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Card - Pressable glass card with subtle animation
 */
export const Card: React.FC<CardProps> = ({ children, onPress, style }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      // Safe haptic call - no-op on web
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Silently fail if haptics are not available
        }
      }
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const content = <GlassPanel style={style}>{children}</GlassPanel>;

  if (onPress) {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[styles.pressable, animatedStyle]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
});
