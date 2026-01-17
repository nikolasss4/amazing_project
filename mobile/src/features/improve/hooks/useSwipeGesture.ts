import { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate, cancelAnimation } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { Dimensions } from 'react-native';
import { useCallback, useMemo } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen width triggers swipe

interface UseSwipeGestureOptions {
  onSwipeComplete?: () => void;
  onSwipeStart?: () => void;
}

/**
 * Custom hook for swipeable card gesture
 * Provides smooth card following with rotation and threshold-based dismissal
 * Cards swipe fully off screen with a "deck" effect
 */
export const useSwipeGesture = ({ onSwipeComplete, onSwipeStart }: UseSwipeGestureOptions = {}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const isDismissing = useSharedValue(false);

  // Memoize the gesture to prevent recreation on every render
  const gesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-10, 10]) // Require 10px movement before activating (prevents accidental swipes)
    .failOffsetY([-15, 15]) // Fail if vertical movement is dominant
    .onStart(() => {
      if (isDismissing.value) return;
      isActive.value = true;
      if (onSwipeStart) {
        runOnJS(onSwipeStart)();
      }
    })
    .onUpdate((event) => {
      if (isDismissing.value) return;
      translateX.value = event.translationX;
      // Dampen vertical movement
      translateY.value = event.translationY * 0.3;
    })
    .onEnd(() => {
      if (isDismissing.value) return;
      const shouldDismiss = Math.abs(translateX.value) > SWIPE_THRESHOLD;

      if (shouldDismiss) {
        isDismissing.value = true;
        // Animate card fully off screen (1.5x width for clean exit with rotation)
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * SCREEN_WIDTH * 1.5,
          { duration: 200 }, // Slightly faster for snappier feel
          (finished) => {
            if (finished && onSwipeComplete) {
              runOnJS(onSwipeComplete)();
            }
          }
        );
        // Also animate Y to give a slight arc
        translateY.value = withTiming(translateY.value + 50, { duration: 200 });
      } else {
        // Snap back to center with snappier spring
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        isActive.value = false;
      }
    }), [onSwipeComplete, onSwipeStart]);

  const animatedStyle = useAnimatedStyle(() => {
    // Rotation effect: -12deg at left, +12deg at right
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-12, 0, 12]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation}deg` },
      ],
    };
  });

  // Animated style for the "next" card behind the current one
  const nextCardAnimatedStyle = useAnimatedStyle(() => {
    const absTranslateX = Math.abs(translateX.value);
    
    // Only show next card when actively swiping (translateX > 20)
    const shouldShow = absTranslateX > 20;
    
    // Scale up the behind card as the front card is swiped away
    const scale = interpolate(
      absTranslateX,
      [20, SWIPE_THRESHOLD, SCREEN_WIDTH],
      [0.95, 0.98, 1]
    );
    
    // Move up slightly as front card moves away
    const translateYBehind = interpolate(
      absTranslateX,
      [20, SWIPE_THRESHOLD, SCREEN_WIDTH],
      [10, 5, 0]
    );
    
    // Fade in only when actively swiping
    const opacity = shouldShow ? interpolate(
      absTranslateX,
      [20, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD],
      [0, 0.85, 1]
    ) : 0;

    return {
      transform: [
        { scale },
        { translateY: translateYBehind },
      ],
      opacity,
    };
  });

  // Reset function that can be called from JS thread
  // Cancels any ongoing animations and resets all values immediately
  const reset = useCallback(() => {
    // Cancel any ongoing animations to prevent race conditions
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    
    // Reset values immediately (no animation needed for reset)
    translateX.value = 0;
    translateY.value = 0;
    isActive.value = false;
    isDismissing.value = false;
  }, [translateX, translateY, isActive, isDismissing]);

  return {
    gesture,
    animatedStyle,
    nextCardAnimatedStyle,
    translateX,
    isActive,
    isDismissing,
    reset,
  };
};
