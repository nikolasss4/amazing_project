import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Centralized haptic feedback patterns for the Improve feature
 * Provides consistent, well-tuned haptic responses
 * Safe for web (no-op on web platform)
 */

// Helper to safely call haptics (no-op on web)
const safeHapticCall = (fn: () => void) => {
  if (Platform.OS !== 'web') {
    try {
      fn();
    } catch (error) {
      // Silently fail if haptics are not available
    }
  }
};

export const HapticPatterns = {
  /**
   * Correct answer - Short, crisp success vibration
   */
  correctAnswer: () => {
    safeHapticCall(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  },

  /**
   * Incorrect answer - Stronger, longer error vibration
   * Includes a double-tap pattern for emphasis
   */
  incorrectAnswer: () => {
    safeHapticCall(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 100);
    });
  },

  /**
   * Card swipe - Light haptic tick
   */
  cardSwipe: () => {
    safeHapticCall(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  },

  /**
   * Button press - Medium haptic feedback
   */
  buttonPress: () => {
    safeHapticCall(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });
  },

  /**
   * Streak milestone - Celebration pattern
   * Fires on reaching streak level 5+
   */
  streakMilestone: () => {
    safeHapticCall(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 150);
    });
  },

  /**
   * Card flip - Soft haptic tick
   */
  cardFlip: () => {
    safeHapticCall(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  },
};
