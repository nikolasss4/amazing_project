import { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width

interface UseSwipeGestureOptions {
  onSwipeComplete?: () => void;
  onSwipeStart?: () => void;
}

/**
 * Custom hook for swipeable card gesture
 * Provides smooth card following with rotation and threshold-based dismissal
 */
export const useSwipeGesture = ({ onSwipeComplete, onSwipeStart }: UseSwipeGestureOptions = {}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const gesture = Gesture.Pan()
    .onStart(() => {
      isActive.value = true;
      if (onSwipeStart) {
        runOnJS(onSwipeStart)();
      }
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      // Dampen vertical movement
      translateY.value = event.translationY * 0.3;
    })
    .onEnd((event) => {
      const shouldDismiss = Math.abs(translateX.value) > SWIPE_THRESHOLD;

      if (shouldDismiss) {
        // Animate card out of screen
        const direction = translateX.value > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * SCREEN_WIDTH,
          { duration: 200 },
          () => {
            isActive.value = false;
            if (onSwipeComplete) {
              runOnJS(onSwipeComplete)();
            }
          }
        );
      } else {
        // Snap back to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        isActive.value = false;
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Rotation effect: -15deg at left, +15deg at right
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15]
    );

    // Opacity: fade slightly when swiping far
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
      [1, 0.9, 0.5]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation}deg` },
      ],
      opacity,
    };
  });

  const reset = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    isActive.value = false;
  };

  return {
    gesture,
    animatedStyle,
    reset,
  };
};
