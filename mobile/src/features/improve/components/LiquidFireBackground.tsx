import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@app/theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export interface LiquidFireBackgroundRef {
  flashGreen: () => void;
  flashRed: () => void;
}

interface LiquidFireBackgroundProps {
  streak: number;
}

// Streak to height percentage mapping
const STREAK_TO_HEIGHT: Record<number, number> = {
  0: 0.12,  // 12%
  1: 0.25,  // 25%
  2: 0.40,  // 40%
  3: 0.60,  // 60%
  4: 0.80,  // 80%
  5: 1.00,  // 100%
};

const getHeightForStreak = (streak: number): number => {
  if (streak >= 5) return STREAK_TO_HEIGHT[5];
  return STREAK_TO_HEIGHT[streak] || STREAK_TO_HEIGHT[0];
};

// Streak to intensity (brightness) mapping
const getIntensityForStreak = (streak: number): number => {
  if (streak >= 5) return 1.2; // Extra bright for crazy streak
  const intensity = 0.6 + (streak * 0.12); // 0.6 to 1.08
  return Math.min(intensity, 1);
};

export const LiquidFireBackground = forwardRef<LiquidFireBackgroundRef, LiquidFireBackgroundProps>(
  ({ streak }, ref) => {
    // Height percentage (0-1)
    const height = useSharedValue(0.12);

    // Intensity (brightness) - 0.6 to 1.2
    const intensity = useSharedValue(0.6);

    // Smooth gradient animation phases (no flicker)
    const wave1 = useSharedValue(0);
    const wave2 = useSharedValue(0);
    const wave3 = useSharedValue(0);

    // Flash state (0 = none, 1 = green flash, -1 = red flash)
    const flashState = useSharedValue(0);

    // Flash overlay opacity
    const flashOpacity = useSharedValue(0);

    // Color mode (0 = green, 1 = red)
    const colorMode = useSharedValue(0);

    // Start continuous smooth animations (smooth gradient motion like screenshot)
    useEffect(() => {
      // Primary smooth wave
      wave1.value = withRepeat(
        withTiming(100, {
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );

      // Secondary smooth wave
      wave2.value = withRepeat(
        withTiming(100, {
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );

      // Tertiary smooth wave
      wave3.value = withRepeat(
        withTiming(100, {
          duration: 10000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }, []);

    // Update height and intensity when streak changes
    useEffect(() => {
      const targetHeight = getHeightForStreak(streak);
      const targetIntensity = getIntensityForStreak(streak);

      height.value = withSpring(targetHeight, {
        damping: 12,
        stiffness: 80,
        mass: 1,
      });

      intensity.value = withSpring(targetIntensity, {
        damping: 15,
        stiffness: 100,
      });
    }, [streak]);

    // Expose flash methods via ref
    useImperativeHandle(ref, () => ({
      flashGreen: () => {
        colorMode.value = 0;
        flashState.value = 1;
        // Flash bright then return
        flashOpacity.value = withSequence(
          withTiming(0.6, { duration: 100 }),
          withTiming(0.3, { duration: 200 }),
          withTiming(0, { duration: 300 })
        );
        // Reset flash state after animation
        setTimeout(() => {
          flashState.value = 0;
        }, 600);
      },
      flashRed: () => {
        colorMode.value = 1;
        flashState.value = -1;
        // Flash red
        flashOpacity.value = withSequence(
          withTiming(0.5, { duration: 100 }),
          withTiming(0.2, { duration: 200 }),
          withTiming(0, { duration: 400 })
        );
        // Reset height to base after red flash
        setTimeout(() => {
          height.value = withSpring(STREAK_TO_HEIGHT[0], {
            damping: 15,
            stiffness: 60,
          });
          intensity.value = withSpring(0.6);
          flashState.value = 0;
        }, 300);
      },
    }));

    // Primary gradient layer with smooth motion
    const animatedContainerStyle = useAnimatedStyle(() => {
      const currentHeight = height.value * SCREEN_HEIGHT;

      // Smooth subtle motion
      const offset = ((wave1.value - 50) / 50) * 8;

      return {
        height: currentHeight + offset,
        bottom: 0,
        opacity: intensity.value,
      };
    });

    // Secondary gradient layer
    const animatedSecondaryStyle = useAnimatedStyle(() => {
      const currentHeight = height.value * SCREEN_HEIGHT * 0.9;

      const offset = ((wave2.value - 50) / 50) * 6;

      return {
        height: currentHeight + offset,
        bottom: 0,
        opacity: intensity.value * 0.8,
      };
    });

    // Tertiary gradient layer
    const animatedTertiaryStyle = useAnimatedStyle(() => {
      const currentHeight = height.value * SCREEN_HEIGHT * 0.8;

      const offset = ((wave3.value - 50) / 50) * 5;

      return {
        height: currentHeight + offset,
        bottom: 0,
        opacity: intensity.value * 0.6,
      };
    });

    // Flash overlay animated style
    const flashOverlayStyle = useAnimatedStyle(() => {
      const backgroundColor = colorMode.value === 0
        ? theme.colors.fireGreen
        : theme.colors.fireRed;

      return {
        opacity: flashOpacity.value,
        backgroundColor,
      };
    });

    // Dark gradient mask (makes it look like fire rising from bottom)
    const darkMaskStyle = useAnimatedStyle(() => {
      // The mask fades in as the fire gets higher
      const maskOpacity = interpolate(
        height.value,
        [0, 0.5, 1],
        [0.3, 0.15, 0]
      );

      return {
        opacity: maskOpacity,
      };
    });

    return (
      <>
        {/* Base dark gradient - same as community page */}
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[
              '#0A0500', // Deep near-black
              '#1A0F00', // Dark charcoal with orange hint
              '#2A1505', // Dark orange-brown
              '#1A0F00', // Back to charcoal
              '#0F0800', // Deep navy-orange blend
            ]}
            locations={[0, 0.3, 0.5, 0.7, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Tertiary gradient layer (background) - orange tones */}
        <Animated.View style={[styles.gradientContainer, animatedTertiaryStyle]}>
          <LinearGradient
            colors={[
              'rgba(255, 107, 53, 0)',
              'rgba(255, 107, 53, 0.12)',
              'rgba(255, 140, 60, 0.20)',
              'rgba(255, 69, 0, 0.28)',
            ]}
            locations={[0, 0.3, 0.6, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </Animated.View>

        {/* Secondary gradient layer - smooth orange blend */}
        <Animated.View style={[styles.gradientContainer, animatedSecondaryStyle]}>
          <LinearGradient
            colors={[
              'rgba(255, 140, 60, 0)',
              'rgba(255, 140, 60, 0.15)',
              'rgba(255, 107, 53, 0.28)',
              'rgba(255, 107, 53, 0.38)',
            ]}
            locations={[0, 0.35, 0.7, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </Animated.View>

        {/* Primary gradient layer (foreground) - brightest orange */}
        <Animated.View style={[styles.gradientContainer, animatedContainerStyle]}>
          <LinearGradient
            colors={[
              'rgba(255, 107, 53, 0)',
              'rgba(255, 107, 53, 0.20)',
              'rgba(255, 140, 60, 0.40)',
              'rgba(255, 179, 71, 0.50)',
            ]}
            locations={[0, 0.4, 0.75, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </Animated.View>

        {/* Flowing orange gradient layer - same as community page */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LinearGradient
            colors={[
              'rgba(255, 107, 53, 0.08)',
              'rgba(255, 140, 60, 0.04)',
              'transparent',
              'rgba(255, 179, 71, 0.06)',
              'rgba(255, 107, 53, 0.05)',
            ]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0.3, y: 0.2 }}
            end={{ x: 0.7, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Dark gradient mask overlay for depth */}
        <Animated.View style={[styles.darkMask, darkMaskStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.3)', '#000000']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
          />
        </Animated.View>

        {/* Flash overlay (green/red flash on correct/incorrect) */}
        <Animated.View style={[styles.flashOverlay, flashOverlayStyle]} pointerEvents="none" />

        {/* Top fade to black for smooth blending */}
        <View style={styles.topFade} pointerEvents="none">
          <LinearGradient
            colors={['#000000', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
      </>
    );
  }
);

LiquidFireBackground.displayName = 'LiquidFireBackground';

const styles = StyleSheet.create({
  gradientContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  darkMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
});
