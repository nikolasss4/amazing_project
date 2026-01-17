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

    // Flame/fog animation phases (multiple layers for organic turbulent effect)
    const turbulence1 = useSharedValue(0);
    const turbulence2 = useSharedValue(0);
    const turbulence3 = useSharedValue(0);
    const turbulence4 = useSharedValue(0);
    const flicker = useSharedValue(0);

    // Flash state (0 = none, 1 = green flash, -1 = red flash)
    const flashState = useSharedValue(0);

    // Flash overlay opacity
    const flashOpacity = useSharedValue(0);

    // Color mode (0 = green, 1 = red)
    const colorMode = useSharedValue(0);

    // Start continuous turbulent animations (irregular, flame-like motion)
    useEffect(() => {
      // Primary turbulent motion (slow, large movements)
      turbulence1.value = withRepeat(
        withTiming(100, {
          duration: 5000,
          easing: Easing.bezier(0.4, 0.1, 0.6, 0.9),
        }),
        -1,
        true
      );

      // Secondary turbulent motion (medium speed, chaotic)
      turbulence2.value = withRepeat(
        withTiming(100, {
          duration: 3500,
          easing: Easing.bezier(0.2, 0.8, 0.3, 0.9),
        }),
        -1,
        true
      );

      // Tertiary turbulent motion (faster, small distortions)
      turbulence3.value = withRepeat(
        withTiming(100, {
          duration: 2200,
          easing: Easing.bezier(0.6, 0.2, 0.8, 0.4),
        }),
        -1,
        true
      );

      // Quaternary motion (very fast, flame tips)
      turbulence4.value = withRepeat(
        withTiming(100, {
          duration: 1500,
          easing: Easing.bezier(0.3, 0.7, 0.4, 0.8),
        }),
        -1,
        true
      );

      // Flickering effect for flame-like intensity variation
      flicker.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 200, easing: Easing.ease }),
          withTiming(0.85, { duration: 150, easing: Easing.ease }),
          withTiming(1, { duration: 180, easing: Easing.ease }),
          withTiming(0.9, { duration: 220, easing: Easing.ease }),
          withTiming(1, { duration: 160, easing: Easing.ease })
        ),
        -1,
        false
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

    // Primary flame/fog layer with turbulent motion
    const animatedContainerStyle = useAnimatedStyle(() => {
      const currentHeight = height.value * SCREEN_HEIGHT;

      // Create flame-like motion using multiple turbulent phases
      const t1 = (turbulence1.value - 50) / 10;
      const t2 = (turbulence2.value - 50) / 15;
      const t3 = (turbulence3.value - 50) / 20;
      const t4 = (turbulence4.value - 50) / 25;
      
      // Combine turbulences for organic, irregular motion
      const turbulentHeight = t1 + (t2 * 0.7) + (t3 * 0.5) + (t4 * 0.3);

      return {
        height: currentHeight + turbulentHeight,
        bottom: 0,
        opacity: intensity.value * flicker.value,
      };
    });

    // Secondary flame layer (offset for depth and irregular shape)
    const animatedSecondaryStyle = useAnimatedStyle(() => {
      const currentHeight = height.value * SCREEN_HEIGHT * 0.88;

      const t2 = (turbulence2.value - 50) / 8;
      const t3 = (turbulence3.value - 50) / 12;
      const t4 = (turbulence4.value - 50) / 18;
      
      const turbulentHeight = t2 + (t3 * 0.6) + (t4 * 0.4);

      return {
        height: currentHeight + turbulentHeight,
        bottom: 0,
        opacity: intensity.value * 0.75 * flicker.value,
      };
    });

    // Tertiary flame layer (background fog-like motion)
    const animatedTertiaryStyle = useAnimatedStyle(() => {
      const currentHeight = height.value * SCREEN_HEIGHT * 0.75;

      const t1 = (turbulence1.value - 50) / 6;
      const t3 = (turbulence3.value - 50) / 10;
      
      const turbulentHeight = (t1 * 0.5) + (t3 * 0.8);

      return {
        height: currentHeight + turbulentHeight,
        bottom: 0,
        opacity: intensity.value * 0.5 * flicker.value,
      };
    });

    // Wisp layer (flame tips, very active)
    const animatedWispStyle = useAnimatedStyle(() => {
      const currentHeight = height.value * SCREEN_HEIGHT * 0.95;

      const t3 = (turbulence3.value - 50) / 5;
      const t4 = (turbulence4.value - 50) / 3;
      
      const turbulentHeight = t3 + t4;

      return {
        height: currentHeight + turbulentHeight,
        bottom: 0,
        opacity: intensity.value * 0.6 * flicker.value,
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
        {/* Tertiary fog layer (furthest back, slow movement) */}
        <Animated.View style={[styles.gradientContainer, animatedTertiaryStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'transparent',
              `${theme.colors.fireGreenDeep}40`,
              theme.colors.fireGreenDeep,
            ]}
            locations={[0, 0.4, 0.7, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
        </Animated.View>

        {/* Secondary flame layer (middle, more opaque) */}
        <Animated.View style={[styles.gradientContainer, animatedSecondaryStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'transparent',
              `${theme.colors.fireGreenDark}60`,
              theme.colors.fireGreenDark,
              theme.colors.fireGreenMid,
            ]}
            locations={[0, 0.3, 0.6, 0.85, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
        </Animated.View>

        {/* Wisp layer (flame tips and particles) */}
        <Animated.View style={[styles.gradientContainer, animatedWispStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              `${theme.colors.fireGreenMid}20`,
              `${theme.colors.fireGreen}40`,
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.4, y: 0 }}
            end={{ x: 0.6, y: 1 }}
          />
        </Animated.View>

        {/* Primary flame layer (foreground, brightest) */}
        <Animated.View style={[styles.gradientContainer, animatedContainerStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'transparent',
              `${theme.colors.fireGreenMid}50`,
              `${theme.colors.fireGreen}90`,
              theme.colors.fireGreen,
              theme.colors.fireGreenMid,
            ]}
            locations={[0, 0.2, 0.5, 0.75, 0.9, 1]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>

        {/* Dark gradient mask overlay (creates atmospheric depth) */}
        <Animated.View style={[styles.darkMask, darkMaskStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.5)', theme.colors.background]}
            locations={[0, 0.6, 1]}
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
            colors={[theme.colors.background, 'transparent']}
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
