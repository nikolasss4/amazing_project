import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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
    scale.value = withSpring(focused ? 1.05 : 1, { damping: 15, stiffness: 300 });
  }, [focused]);

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={name}
        size={24}
        color={focused ? '#60A5FA' : 'rgba(255, 255, 255, 0.5)'}
      />
    </Animated.View>
  );
};

interface TabButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ iconName, focused, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 120 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tab, animatedStyle]}
    >
      {/* Glass button background */}
      <BlurView intensity={focused ? 15 : 10} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={
          focused
            ? ['rgba(96, 165, 250, 0.12)', 'rgba(59, 130, 246, 0.08)']
            : ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.04)']
        }
        style={StyleSheet.absoluteFill}
      />
      
      <TabIcon name={iconName} focused={focused} />
    </AnimatedPressable>
  );
};

/**
 * CustomTabBar - Telegram-style liquid glass navigation
 * Premium dark UI with frosted glass, subtle gradients, and soft glows
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
    Improve: 'school',
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
      <View style={styles.leftPillWrapper}>
        {/* Frosted glass background */}
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        
        {/* Gradient tint inside glass (deep navy → charcoal) */}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.12)', 'rgba(30, 41, 59, 0.10)', 'rgba(15, 23, 42, 0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Inner highlight at top edge */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.3 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        
        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const iconName = iconMap[route.name] || 'ellipse';

            return (
              <TabButton
                key={route.key}
                iconName={iconName}
                focused={isFocused}
                onPress={() => handleTabPress(route, index)}
              />
            );
          })}
        </View>
      </View>

      {/* Right circle - AI Assistant */}
      <View style={styles.assistantCircleWrapper}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.12)', 'rgba(30, 41, 59, 0.10)']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <AnimatedPressable onPress={handleAssistantPress} style={styles.assistantCircle}>
          <Ionicons name="sparkles" size={24} color="#60A5FA" />
        </AnimatedPressable>
      </View>
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  leftPillWrapper: {
    borderRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  tab: {
    width: 52,
    height: 52,
    borderRadius: 26, // Half of width/height for perfect circle
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  assistantCircleWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28, // Half of width/height for perfect circle
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
  },
  assistantCircle: {
    width: 56,
    height: 56,
    borderRadius: 28, // Half of width/height for perfect circle
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
});
