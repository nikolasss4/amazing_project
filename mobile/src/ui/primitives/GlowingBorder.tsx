import React, { useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, ViewProps, ViewStyle, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { theme } from '@app/theme';

interface GlowingBorderProps extends ViewProps {
  children?: React.ReactNode;
  glowColor?: string;
  gradientColors?: string[];
  borderWidth?: number;
  borderRadius?: number;
  style?: ViewStyle;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  movementDuration?: number;
  disabled?: boolean;
  glow?: boolean;
}

/**
 * GlowingBorder - Creates an animated glowing border effect for React Native
 * Tracks touch position and rotates gradient border to follow the pointer
 * Uses orange/red/yellow gradient colors that light up on interaction
 */
export const GlowingBorder: React.FC<GlowingBorderProps> = ({
  children,
  glowColor = 'rgba(255, 107, 53, 0.6)',
  gradientColors: customGradientColors,
  borderWidth = 2,
  borderRadius = theme.borderRadius.lg,
  inactiveZone = 0.7,
  proximity = 0,
  spread = 20,
  movementDuration = 2000,
  disabled = false,
  glow = false,
  style,
  ...props
}) => {
  const containerRef = useRef<View>(null);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(disabled ? 1 : 0.6); // Base opacity, increases on hover
  const intensity = useSharedValue(1); // Intensity multiplier for hover effect
  const lastPosition = useRef({ x: 0, y: 0 });

  const handleMove = useCallback(
    (locationX: number, locationY: number) => {
      if (disabled || !containerRef.current) return;

      containerRef.current.measure((fx, fy, width, height, px, py) => {
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const touchX = locationX;
        const touchY = locationY;

        lastPosition.current = { x: touchX, y: touchY };

        const distanceFromCenter = Math.hypot(
          touchX - centerX,
          touchY - centerY
        );
        const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

        if (distanceFromCenter < inactiveRadius) {
          opacity.value = withTiming(0.4, { duration: 300 });
          intensity.value = withTiming(0.9, { duration: 300 });
          return;
        }

        // Increase intensity when touching (light up effect)
        intensity.value = withTiming(1.8, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });

        // Calculate target angle to point at touch position
        const currentAngle = rotation.value;
        let targetAngle =
          (180 * Math.atan2(touchY - centerY, touchX - centerX)) / Math.PI + 90;

        // Calculate shortest rotation path (handle wraparound)
        const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
        const newAngle = currentAngle + angleDiff;

        // Cancel any existing animation
        cancelAnimation(rotation);

        // Animate to new angle with easing matching web version [0.16, 1, 0.3, 1]
        rotation.value = withTiming(newAngle, {
          duration: movementDuration,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
      });
    },
    [disabled, inactiveZone, movementDuration, rotation, opacity, intensity]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false, // Don't capture initial touch - let children handle taps
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Only capture on movement (drag), not on taps
          if (disabled) return false;
          // Only capture if user is dragging (not just tapping)
          return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          handleMove(locationX, locationY);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          handleMove(locationX, locationY);
        },
        onPanResponderRelease: () => {
          if (!disabled) {
            // Reduce intensity when touch ends (back to base state)
            intensity.value = withTiming(1, { duration: 300 });
            opacity.value = withTiming(0.6, { duration: 300 });
          }
        },
      }),
    [disabled, handleMove, opacity, intensity]
  );

  useEffect(() => {
    if (disabled) {
      opacity.value = glow ? 1 : 1;
      intensity.value = 1;
    } else {
      opacity.value = 0.6; // Base visibility
      intensity.value = 1;
    }
  }, [disabled, glow, opacity, intensity]);

  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: intensity.value }, // Scale up when hovering for more dynamic effect
      ],
    };
  });

  // Create gradient colors with orange, red, and yellow shades (warm gradient)
  // Colors: #FF6B35 (vibrant orange-red), #FF8C42 (bright orange), #FFB347 (yellow-orange), #FF4500 (red-orange)
  const gradientColors = React.useMemo(() => {
    if (customGradientColors && customGradientColors.length > 0) {
      return customGradientColors;
    }
    
    const color1 = '#FF6B35'; // Vibrant orange-red
    const color2 = '#FF8C42'; // Bright orange
    const color3 = '#FFB347'; // Yellow-orange
    const color4 = '#FF6B35'; // Back to orange-red
    const color5 = '#FF4500'; // Red-orange
    const color6 = '#FFB347'; // Yellow-orange (loop back)

    return [color1, color2, color3, color4, color5, color6, color1];
  }, [customGradientColors]);

  return (
    <View
      ref={containerRef}
      style={[styles.container, { borderRadius }, style]}
      {...props}
    >
      {!disabled && (
        <Animated.View
          style={[
            styles.gradientContainer,
            { borderRadius },
            animatedGradientStyle,
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={gradientColors}
            locations={[0, 0.16, 0.33, 0.5, 0.66, 0.83, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {disabled && (
        <View
          style={[
            styles.staticBorder,
            {
              borderRadius,
              borderWidth,
              borderColor: glow ? glowColor : 'rgba(255, 107, 53, 0.3)',
            },
          ]}
          pointerEvents="none"
        />
      )}

      <View
        style={[
          styles.innerContainer,
          {
            borderRadius: borderRadius - borderWidth,
            margin: borderWidth,
            backgroundColor: 'rgba(8, 8, 12, 0.95)',
          },
        ]}
        pointerEvents="auto"
        {...(disabled ? {} : panResponder.panHandlers)}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradientContainer: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
  },
  staticBorder: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
  },
  innerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});
