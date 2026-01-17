import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { theme } from '@app/theme';
import { useAssistantStore } from '@app/store';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 15, stiffness: 300 });
  }, [focused]);

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={name}
        size={24}
        color={focused ? theme.colors.accent : theme.colors.textSecondary}
      />
    </Animated.View>
  );
};

/**
 * CustomTabBar - Telegram-like navigation with pill bubbles
 * Left pill: Trade, Community, Learn tabs
 * Right pill: AI Assistant button
 */
export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const setAssistantOpen = useAssistantStore((s) => s.setIsOpen);

  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    Trade: 'trending-up',
    Community: 'people',
    Learn: 'school',
  };

  const handleTabPress = (route: any, index: number) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name);
    }
  };

  const handleAssistantPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAssistantOpen(true);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || theme.spacing.md }]}>
      {/* Left pill - Main navigation tabs */}
      <GlassPanel style={styles.leftPill}>
        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const iconName = iconMap[route.name] || 'ellipse';

            return (
              <AnimatedPressable
                key={route.key}
                onPress={() => handleTabPress(route, index)}
                style={styles.tab}
              >
                <TabIcon name={iconName} focused={isFocused} />
              </AnimatedPressable>
            );
          })}
        </View>
      </GlassPanel>

      {/* Right pill - AI Assistant */}
      <GlassPanel style={styles.rightPill}>
        <AnimatedPressable onPress={handleAssistantPress} style={styles.assistantButton}>
          <View style={styles.aiIconContainer}>
            <Ionicons name="sparkles" size={24} color={theme.colors.accent} />
          </View>
        </AnimatedPressable>
      </GlassPanel>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  leftPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  tab: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  rightPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  assistantButton: {
    width: 56,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accentMuted,
  },
});
