import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { theme } from '@app/theme';

/**
 * ScenarioCardSkeleton - Loading placeholder for scenario cards
 * Displays animated shimmer effect while content is loading
 */
export const ScenarioCardSkeleton: React.FC = () => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [0.3, 0.6, 0.3]
    );
    return { opacity };
  });

  return (
    <GlassPanel style={styles.container} borderless>
      {/* Chart skeleton (65%) */}
      <View style={styles.chartSection}>
        <Animated.View style={[styles.chartSkeleton, shimmerStyle]} />
        {/* Trading pair label skeleton */}
        <View style={styles.labelSkeleton}>
          <Animated.View style={[styles.labelTextSkeleton, shimmerStyle]} />
        </View>
      </View>

      {/* Bottom section (35%) */}
      <View style={styles.bottomSection}>
        {/* Scenario text skeleton */}
        <View style={styles.scenarioContainer}>
          <Animated.View style={[styles.labelSkeleton2, shimmerStyle]} />
          <Animated.View style={[styles.textLine, shimmerStyle]} />
          <Animated.View style={[styles.textLineShort, shimmerStyle]} />
          <Animated.View style={[styles.textLine, shimmerStyle]} />
        </View>

        {/* Buttons skeleton */}
        <View style={styles.actionsContainer}>
          <Animated.View style={[styles.buttonSkeleton, shimmerStyle]} />
          <Animated.View style={[styles.buttonSkeleton, shimmerStyle]} />
          <Animated.View style={[styles.buttonSkeletonSecondary, shimmerStyle]} />
        </View>
      </View>
    </GlassPanel>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  chartSection: {
    flex: 65,
    position: 'relative',
  },
  chartSkeleton: {
    flex: 1,
    backgroundColor: theme.colors.backgroundElevated,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  labelSkeleton: {
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  labelTextSkeleton: {
    width: 80,
    height: 24,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.sm,
  },
  bottomSection: {
    flex: 35,
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  scenarioContainer: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  labelSkeleton2: {
    width: 60,
    height: 12,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.sm,
  },
  textLine: {
    height: 14,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.sm,
  },
  textLineShort: {
    width: '70%',
    height: 14,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.sm,
  },
  actionsContainer: {
    width: 110,
    gap: theme.spacing.sm,
  },
  buttonSkeleton: {
    height: 44,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.md,
  },
  buttonSkeletonSecondary: {
    height: 44,
    backgroundColor: theme.colors.glassBackground,
    borderRadius: theme.borderRadius.md,
  },
});
