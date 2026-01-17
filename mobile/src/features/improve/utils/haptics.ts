import * as Haptics from 'expo-haptics';

/**
 * Centralized haptic feedback patterns for the Improve feature
 * Provides consistent, well-tuned haptic responses
 */

export const HapticPatterns = {
  /**
   * Correct answer - Short, crisp success vibration
   */
  correctAnswer: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /**
   * Incorrect answer - Stronger, longer error vibration
   * Includes a double-tap pattern for emphasis
   */
  incorrectAnswer: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 100);
  },

  /**
   * Card swipe - Light haptic tick
   */
  cardSwipe: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Button press - Medium haptic feedback
   */
  buttonPress: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Streak milestone - Celebration pattern
   * Fires on reaching streak level 5+
   */
  streakMilestone: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 150);
  },

  /**
   * Card flip - Soft haptic tick
   */
  cardFlip: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
};
