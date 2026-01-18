import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  runOnJS,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { theme } from '@app/theme';
import { useImproveStore } from '@app/store';
import { mockScenarios, Answer } from '../models';
import { LiquidFireBackground, LiquidFireBackgroundRef } from '../components/LiquidFireBackground';
import { Avatar } from '../../community/components/Avatar';
import { CandlestickChart } from '../components/CandlestickChart';
import { ScenarioCardSkeleton } from '../components/ScenarioCardSkeleton';
import { EmptyState } from '../components/EmptyState';
import { HapticPatterns } from '../utils/haptics';

// Calculate streak display value: multiply (double) until 30, then add 10
const calculateStreakValue = (streak: number): number => {
  if (streak <= 0) return 0;
  
  // Find the streak count where doubling would exceed 30
  // 1, 2, 4, 8, 16 (streak 5) - next would be 32 which exceeds 30
  const maxDoubleStreak = 5; // At streak 5, value is 16
  
  if (streak <= maxDoubleStreak) {
    return Math.pow(2, streak - 1); // 1, 2, 4, 8, 16
  } else {
    // After streak 5, add 10 for each additional correct answer
    const baseValue = Math.pow(2, maxDoubleStreak - 1); // 16
    const additionalCorrect = streak - maxDoubleStreak;
    return baseValue + (additionalCorrect * 10); // 26, 36, 46, 56...
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Static Gradient Border Component - extracted outside to prevent hook violations
// Each animated layer is a separate memoized component with its own hook
const SilverGradientLayer = memo(({ colorState }: { colorState: SharedValue<number> }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(colorState.value), [0, 1], [1, 0]),
  }));
  
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <LinearGradient
        colors={['#E8E8E8', '#C0C0C0', '#A8A8A8', '#D4D4D4', '#B8B8B8', '#E0E0E0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

const GreenGradientLayer = memo(({ colorState }: { colorState: SharedValue<number> }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(colorState.value, [0, 1], [0, 1]),
  }));
  
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <LinearGradient
        colors={['#00E676', '#69F0AE', '#00C853', '#A5D6A7', '#4CAF50', '#81C784']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

const RedGradientLayer = memo(({ colorState }: { colorState: SharedValue<number> }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(colorState.value, [-1, 0], [1, 0]),
  }));
  
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <LinearGradient
        colors={['#FF5252', '#FF8A80', '#F44336', '#FFCDD2', '#E57373', '#EF9A9A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

// Main gradient border component - properly memoized
const StaticGradientBorder = memo(({ colorState }: { colorState: SharedValue<number> }) => {
  return (
    <View style={styles.gradientBorderStack}>
      <SilverGradientLayer colorState={colorState} />
      <GreenGradientLayer colorState={colorState} />
      <RedGradientLayer colorState={colorState} />
    </View>
  );
});

export const ImproveScreen: React.FC = () => {
  const { totalXP, streak, addXP, incrementStreak, incrementCorrect, resetStreak } = useImproveStore();
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(streak);
  const [isLoading, setIsLoading] = useState(false);
  const [showStreakTransfer, setShowStreakTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState(0);
  const scenarios = mockScenarios; // In production, this would come from an API

  const backgroundRef = useRef<LiquidFireBackgroundRef>(null);
  const currentScenario = scenarios[currentScenarioIndex];
  const flipRotation = useSharedValue(0);
  const streakPulse = useSharedValue(1);
  const feedbackOpacity = useSharedValue(0);
  const cardTranslateX = useSharedValue(0);
  
  // Border color state: 0 = silver (neutral), 1 = green (correct), -1 = red (incorrect)
  const borderColorState = useSharedValue(0);
  
  // Animation values for streak transfer
  const streakTransferY = useSharedValue(0);
  const streakTransferX = useSharedValue(0);
  const streakTransferScale = useSharedValue(1);
  const streakTransferOpacity = useSharedValue(0);
  const lightningPulse = useSharedValue(1);


  // Define handleNextScenario - advances to next card
  // Uses synchronous state updates to prevent race conditions
  const handleNextScenario = useCallback(() => {
    // Update scenario index
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
    } else {
      setCurrentScenarioIndex(0); // Loop back
    }
    
    // Reset ALL state
    setIsFlipped(false);
    setSelectedAnswer(null);
    setIsCorrect(false);
    setShowFeedback(false);
    
    // Reset all animated values
    flipRotation.value = 0;
    borderColorState.value = 0; // Reset to silver
    feedbackOpacity.value = 0;
    // Don't reset cardTranslateX here - it's handled in handleNext animation
  }, [currentScenarioIndex, flipRotation, borderColorState, scenarios.length]);

  

  // Animate streak pulse when it increases
  useEffect(() => {
    if (streak > previousStreak) {
      streakPulse.value = withSequence(
        withSpring(1.2, { damping: 5, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
    }
    setPreviousStreak(streak);
  }, [streak, previousStreak]);

  // Card flip animations
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 1], [0, 180]);
    const opacity = interpolate(flipRotation.value, [0, 0.5, 1], [1, 0, 0]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden' as const,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 1], [180, 360]);
    const opacity = interpolate(flipRotation.value, [0, 0.5, 1], [0, 0, 1]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden' as const,
    };
  });

  // Streak chip animated styles (glow at 5+)
  const streakAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakPulse.value }],
  }));
  
  // Lightning chip animated style (pulse when receiving points)
  const lightningAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lightningPulse.value }],
  }));
  
  // Streak transfer animation (flying from streak to lightning)
  const streakTransferAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: streakTransferX.value },
      { translateY: streakTransferY.value },
      { scale: streakTransferScale.value },
    ],
    opacity: streakTransferOpacity.value,
  }));

  // Feedback overlay animation
  const feedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: feedbackOpacity.value,
  }));

  // Card fly-away animation
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardTranslateX.value }],
  }));

  // Select answer and immediately show solution
  const handleAnswerSelect = useCallback((answer: Answer) => {
    // Don't allow answering if card is flipped
    if (isFlipped) return;
    
    setSelectedAnswer(answer);
    HapticPatterns.buttonPress();
    
    // Immediately trigger solution reveal
    const correct = answer === currentScenario.correctAnswer;
    setIsCorrect(correct);
    
    // Update border color state (1 = green, -1 = red)
    borderColorState.value = withTiming(correct ? 1 : -1, { duration: 400 });

    // Haptic feedback
    if (correct) {
      HapticPatterns.correctAnswer();
    } else {
      HapticPatterns.incorrectAnswer();
    }

    // Flip card
    HapticPatterns.cardFlip();
    flipRotation.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }, () => {
      runOnJS(setIsFlipped)(true);
    });

    // Show feedback overlay briefly
    setShowFeedback(true);
    feedbackOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 800 })
    );
    setTimeout(() => setShowFeedback(false), 1000);

    // Update background and scores
    if (correct) {
      backgroundRef.current?.flashGreen();
      // Only increment streak - points accumulate in streak counter
      // Points will transfer to lightning only when user fails
      incrementStreak();
      incrementCorrect();
      // Streak milestone haptic at level 5
      const newStreak = streak + 1;
      if (newStreak >= 5) {
        HapticPatterns.streakMilestone();
      }
    } else {
      backgroundRef.current?.flashRed();
      
      // Animate streak points transfer to lightning before resetting
      const currentStreakValue = calculateStreakValue(streak);
      if (currentStreakValue > 0) {
        setTransferAmount(currentStreakValue);
        setShowStreakTransfer(true);
        
        // Reset animation values
        streakTransferX.value = 100; // Start from right (near streak chip)
        streakTransferY.value = 0;
        streakTransferScale.value = 1;
        streakTransferOpacity.value = 1;
        
        // Animate flying to the left (to lightning chip)
        streakTransferX.value = withTiming(-100, { duration: 600, easing: Easing.out(Easing.ease) });
        streakTransferY.value = withSequence(
          withTiming(-30, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
        );
        streakTransferScale.value = withSequence(
          withTiming(1.3, { duration: 300 }),
          withTiming(0.8, { duration: 300 })
        );
        streakTransferOpacity.value = withDelay(400, withTiming(0, { duration: 200 }));
        
        // Pulse the lightning chip when points arrive
        setTimeout(() => {
          lightningPulse.value = withSequence(
            withSpring(1.3, { damping: 5, stiffness: 200 }),
            withSpring(1, { damping: 8, stiffness: 200 })
          );
          // Add the streak points to total XP
          addXP(currentStreakValue);
          setShowStreakTransfer(false);
        }, 600);
      }
      
      resetStreak();
    }
  }, [isFlipped, currentScenario, borderColorState, flipRotation, feedbackOpacity, backgroundRef, addXP, incrementStreak, incrementCorrect, resetStreak, streak, streakTransferX, streakTransferY, streakTransferScale, streakTransferOpacity, lightningPulse]);

  // Legacy function kept for reference but no longer used
  const handleShowSolution = () => {
    // No longer used - answer buttons trigger solution directly
  };

  // Flip back to front side - allows re-answering
  const handleFlipBack = () => {
    HapticPatterns.cardFlip();
    // Reset border color to silver
    borderColorState.value = withTiming(0, { duration: 400 });
    // Reset answer selection to allow re-answering
    setSelectedAnswer(null);
    flipRotation.value = withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }, () => {
      runOnJS(setIsFlipped)(false);
    });
  };

  // Handle "Next" button press (from solution card)
  const handleNext = () => {
    // Animate card flying away to the left
    const screenWidth = Dimensions.get('window').width;
    cardTranslateX.value = withTiming(
      -screenWidth * 1.5, // Fly completely off screen to the left
      {
        duration: 400,
        easing: Easing.out(Easing.ease),
      },
      () => {
        // After animation completes, move to next scenario
        runOnJS(handleNextScenario)();
        // Position next card off-screen to the right, then animate it in
        cardTranslateX.value = screenWidth;
        cardTranslateX.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.ease),
        });
      }
    );
  };


  const getAnswerIcon = (answer: Answer): keyof typeof Ionicons.glyphMap => {
    return answer === 'up' ? 'trending-up' : 'trending-down';
  };

  const getAnswerColor = (answer: Answer) => {
    return answer === 'up' ? theme.colors.bullish : theme.colors.bearish;
  };

  return (
    <View style={styles.container}>
      {/* Dynamic background that responds to streak - with community page orange colors */}
      <LiquidFireBackground ref={backgroundRef} streak={streak} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Avatar
              userId="3"
              username="TechBull"
              size={48}
              isYou={true}
            />
          </View>
          <View style={styles.headerRight}>
            {/* Streak indicator with pulse animation */}
            <Animated.View style={[styles.streakChipContainer, streakAnimatedStyle]}>
              <GlassPanel style={[styles.streakChip, streak >= 5 && styles.streakChipGlow]}>
                <View style={styles.streakChipContent}>
                  <Ionicons
                    name="flame"
                    size={16}
                    color={streak >= 5 ? theme.colors.warning : theme.colors.textSecondary}
                  />
                  <Text 
                    style={[styles.streakText, streak >= 5 && styles.streakTextGlow]}
                    numberOfLines={1}
                  >
                    {calculateStreakValue(streak)}
                  </Text>
                </View>
              </GlassPanel>
            </Animated.View>
          </View>
        </View>
        
        {/* Streak Transfer Animation */}
        {showStreakTransfer && (
          <Animated.View style={[styles.streakTransferBadge, streakTransferAnimatedStyle]}>
            <Ionicons name="flame" size={20} color={theme.colors.warning} />
            <Text style={styles.streakTransferText}>+{transferAmount}</Text>
          </Animated.View>
        )}

        {/* Scenario Card Container with padding */}
        <View style={styles.cardContainerWrapper}>
          <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
            {/* Loading State */}
            {isLoading && <ScenarioCardSkeleton />}

            {/* Empty State */}
            {!isLoading && scenarios.length === 0 && <EmptyState />}

            {/* Scenario Card - only show when loaded and has scenarios */}
            {!isLoading && scenarios.length > 0 && currentScenario && (
              <>
                {/* Front of card with gradient border */}
                <Animated.View 
                  key={`front-${currentScenario.id}`}
                  style={[styles.cardWrapper, frontAnimatedStyle]}
                >
                  {/* Gradient Border that flips with the card */}
                  <View style={styles.gradientBorderContainer} pointerEvents="none">
                    <StaticGradientBorder colorState={borderColorState} />
                    <View style={styles.gradientBorderInner} />
                  </View>
                  <View style={styles.cardContent}>
                    {/* Top section: Chart */}
                    <View style={styles.chartSection}>
                      <CandlestickChart
                        tradingPair={currentScenario.tradingPair}
                        timeframe={currentScenario.timeframe}
                        seed={currentScenario.id}
                        showOutcome={null}
                      />
                    </View>

                  {/* Bottom section: Split left/right */}
                  <View style={styles.bottomSection}>
                    {/* Left: Scenario text */}
                    <View style={styles.scenarioContainer}>
                      <Text style={styles.scenarioLabel}>SCENARIO</Text>
                      <Text style={styles.scenarioText}>
                        {currentScenario.economicContext}
                      </Text>
                    </View>

                    {/* Right: Action buttons (vertical stack) */}
                    <View style={styles.upDownButtonsContainer}>
                      <UpDownButton
                        direction="up"
                        selected={selectedAnswer === 'up'}
                        disabled={isFlipped}
                        onPress={() => handleAnswerSelect('up')}
                      />
                      <UpDownButton
                        direction="down"
                        selected={selectedAnswer === 'down'}
                        disabled={isFlipped}
                        onPress={() => handleAnswerSelect('down')}
                      />
                    </View>
                  </View>
                  </View>
                </Animated.View>

            {/* Back of card (Solution) with gradient border */}
            <Animated.View 
              key={`back-${currentScenario.id}`}
              style={[styles.cardWrapper, styles.cardBack, backAnimatedStyle]}
            >
              {/* Gradient Border that flips with the card */}
              <View style={styles.gradientBorderContainer} pointerEvents="none">
                <StaticGradientBorder colorState={borderColorState} />
                <View style={styles.gradientBorderInner} />
              </View>
              <View style={styles.cardContent}>
                {/* Top section: Solution chart with outcome */}
                <View style={styles.chartSection}>
                  <CandlestickChart
                    tradingPair={currentScenario.tradingPair}
                    timeframe={currentScenario.timeframe}
                    seed={`${currentScenario.id}-solution`}
                    showOutcome={currentScenario.correctAnswer as 'up' | 'down'}
                  />
                </View>

                {/* Bottom section: Analysis & Actions - NOT wrapped in gesture detector */}
                <View style={styles.bottomSection}>
                  {/* Left: What happened analysis */}
                  <View style={styles.analysisContainer}>
                    <Text style={styles.analysisLabel}>WHAT HAPPENED</Text>
                    <Text style={styles.analysisText} numberOfLines={3}>
                      {currentScenario.explanation}
                    </Text>
                    <View style={styles.answerSummary}>
                      <View style={styles.answerRow}>
                        <Text style={styles.answerSummaryLabel}>You:</Text>
                        <View style={styles.answerBadge}>
                          <Ionicons
                            name={selectedAnswer ? getAnswerIcon(selectedAnswer) : 'help'}
                            size={14}
                            color={selectedAnswer ? getAnswerColor(selectedAnswer) : theme.colors.textSecondary}
                          />
                          <Text style={[
                            styles.answerBadgeText,
                            selectedAnswer && { color: getAnswerColor(selectedAnswer) }
                          ]}>
                            {selectedAnswer?.toUpperCase() || '-'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.answerRow}>
                        <Text style={styles.answerSummaryLabel}>Correct:</Text>
                        <View style={styles.answerBadge}>
                          <Ionicons
                            name={getAnswerIcon(currentScenario.correctAnswer as Answer)}
                            size={14}
                            color={getAnswerColor(currentScenario.correctAnswer as Answer)}
                          />
                          <Text style={[
                            styles.answerBadgeText,
                            { color: getAnswerColor(currentScenario.correctAnswer as Answer) }
                          ]}>
                            {currentScenario.correctAnswer.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Right: Solution actions */}
                  <View style={styles.actionsContainer}>
                    <LiquidGlassButton
                      icon="refresh"
                      variant="secondary"
                      onPress={handleFlipBack}
                    />
                    <LiquidGlassButton
                      icon="arrow-forward"
                      variant="primary"
                      color={theme.colors.accent}
                      onPress={handleNext}
                    />
                  </View>
                </View>
                </View>
              </Animated.View>
              </>
            )}
          </Animated.View>
        </View>

        {/* Feedback overlay */}
        {showFeedback && (
          <Animated.View
            style={[
              styles.feedbackOverlay,
              feedbackAnimatedStyle,
              { backgroundColor: isCorrect ? theme.colors.successMuted : theme.colors.errorMuted }
            ]}
            pointerEvents="none"
          >
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={80}
              color={isCorrect ? theme.colors.success : theme.colors.error}
            />
          </Animated.View>
        )}
        </View>
      </SafeAreaView>
    </View>
  );
};

// Up/Down Button Component with green/red liquid glass style
interface UpDownButtonProps {
  direction: 'up' | 'down';
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const UpDownButton: React.FC<UpDownButtonProps> = ({
  direction,
  selected = false,
  disabled = false,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const brightness = useSharedValue(1);
  
  const isUp = direction === 'up';
  const buttonColor = isUp ? theme.colors.bullish : theme.colors.bearish;
  const label = isUp ? 'Up' : 'Down';
  const icon = isUp ? 'arrow-up' : 'arrow-down';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: brightness.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    brightness.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    brightness.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (!disabled) {
      // Safe haptic call - no-op on web
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Silently fail if haptics are not available
        }
      }
      onPress();
    }
  };

  return (
    <Animated.View style={animatedStyle} collapsable={false}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.upDownButton,
          {
            borderColor: selected ? buttonColor : `${buttonColor}80`,
            backgroundColor: selected ? buttonColor : `${buttonColor}1A`,
          },
          disabled && styles.upDownButtonDisabled,
        ]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        android_ripple={null}
        pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <View style={styles.upDownButtonContent} pointerEvents="none">
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={disabled ? theme.colors.textTertiary : (selected ? '#FFF' : `${buttonColor}E0`)}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};

// Liquid Glass Button Component
interface LiquidGlassButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant: 'primary' | 'secondary';
  selected?: boolean;
  disabled?: boolean;
  color?: string;
  onPress: () => void;
}

const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  label,
  icon,
  variant,
  selected = false,
  disabled = false,
  color,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const brightness = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: brightness.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    brightness.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    brightness.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (!disabled) {
      // Safe haptic call - no-op on web
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Silently fail if haptics are not available
        }
      }
      onPress();
    }
  };

  const isPrimary = variant === 'primary';
  const activeColor = color || theme.colors.accent;

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.glassButton,
        isPrimary ? styles.glassButtonPrimary : styles.glassButtonSecondary,
        {
          borderColor: selected ? activeColor : (isPrimary ? `${activeColor}80` : theme.colors.glassBorder),
          backgroundColor: selected ? activeColor : (isPrimary ? `${activeColor}1A` : 'rgba(255, 255, 255, 0.05)'),
        },
        disabled && styles.glassButtonDisabled,
        animatedStyle,
      ]}
    >
      <View style={styles.glassButtonContent} pointerEvents="none">
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={selected ? '#FFF' : (disabled ? theme.colors.textTertiary : theme.colors.textPrimary)}
          />
        )}
        {label && (
          <Text style={[
            styles.glassButtonText,
            selected && { color: activeColor },
            disabled && styles.glassButtonTextDisabled,
          ]}>
            {label}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  lightningChipContainer: {},
  lightningChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  lightningChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  lightningText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFD700',
  },
  streakTransferBadge: {
    position: 'absolute',
    top: 80,
    left: '50%',
    marginLeft: -40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.5)',
    zIndex: 1000,
  },
  streakTransferText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.warning,
  },
  progressChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.glassBackground,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  progressText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  streakChipContainer: {},
  streakChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  streakChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.xs,
    flexWrap: 'nowrap',
  },
  streakChipGlow: {
    ...theme.shadows.glow,
    shadowColor: theme.colors.warning,
  },
  streakText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  streakTextGlow: {
    color: theme.colors.warning,
  },
  // Card wrapper with padding from phone edges
  cardContainerWrapper: {
    flex: 1,
    paddingBottom: 100, // Large bottom padding to avoid menu overlap
  },
  // Card container
  cardContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  // Card wrapper - holds both the gradient border and content, flips together
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  // Gradient border styles - static border like screenshot
  gradientBorderContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.xl,
    padding: 2,
    overflow: 'hidden',
  },
  gradientBorderStack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  gradientBorderInner: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    backgroundColor: 'rgba(10, 10, 14, 0.98)',
    borderRadius: theme.borderRadius.xl - 2,
  },
  cardBack: {
    backfaceVisibility: 'hidden',
  },
  cardContent: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'column',
    backgroundColor: 'rgba(10, 10, 14, 0.98)',
    borderRadius: theme.borderRadius.xl - 2,
  },
  // Chart section (smaller portion to give more room to scenario)
  chartSection: {
    flex: 2.5,
    minHeight: 0,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  // Bottom section - text and buttons (more room for scenario)
  bottomSection: {
    flex: 2,
    minHeight: 0,
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    zIndex: 50,
    elevation: 50,
  },
  // Scenario (left side)
  scenarioContainer: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  scenarioLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  scenarioText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: theme.typography.weights.regular,
  },
  // Actions (right side)
  actionsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    zIndex: 100, // Ensure buttons are above other elements
    elevation: 100, // Android elevation
  },
  // Up/Down buttons container (front side - closer together)
  upDownButtonsContainer: {
    width: 70,
    justifyContent: 'center',
    gap: theme.spacing.xs,
    zIndex: 100, // Ensure buttons are above other elements
    elevation: 100, // Android elevation
  },
  // Up/Down Button styles
  upDownButton: {
    width: 70,
    height: 85,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 2,
    zIndex: 101,
    elevation: 101,
  },
  upDownButtonDisabled: {
    opacity: 0.4,
  },
  upDownButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Analysis section (solution back)
  analysisContainer: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  analysisLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  analysisText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: theme.typography.weights.regular,
    marginBottom: theme.spacing.sm,
  },
  answerSummary: {
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  answerSummaryLabel: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    width: 50,
  },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.sm,
  },
  answerBadgeText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  // Feedback overlay
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  // Liquid Glass Button styles
  glassButton: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 2,
    position: 'relative',
  },
  glassButtonDisabled: {
    opacity: 0.4,
  },
  glassButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButtonText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  glassButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
});
