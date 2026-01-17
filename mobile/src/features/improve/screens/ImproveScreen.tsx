import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  interpolate,
  runOnJS,
  Easing,
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
import { CandlestickChart } from '../components/CandlestickChart';
import { ScenarioCardSkeleton } from '../components/ScenarioCardSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { HapticPatterns } from '../utils/haptics';
import { GestureDetector } from 'react-native-gesture-handler';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ImproveScreen: React.FC = () => {
  const { totalXP, streak, addXP, incrementStreak, incrementCorrect, resetStreak } = useImproveStore();
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(streak);
  const [isLoading, setIsLoading] = useState(false);
  const scenarios = mockScenarios; // In production, this would come from an API

  const backgroundRef = useRef<LiquidFireBackgroundRef>(null);
  const currentScenario = scenarios[currentScenarioIndex];
  const flipRotation = useSharedValue(0);
  const streakPulse = useSharedValue(1);
  const feedbackOpacity = useSharedValue(0);
  
  // Border color state: 0 = silver (neutral), 1 = green (correct), -1 = red (incorrect)
  const borderColorState = useSharedValue(0);

  // Swipe gesture for front card dismissal
  const { gesture: swipeGesture, animatedStyle: swipeAnimatedStyle, reset: resetSwipe } = useSwipeGesture({
    onSwipeComplete: handleSkip,
    onSwipeStart: () => HapticPatterns.cardSwipe(),
  });

  // Swipe gesture for back card (solution) - advances to next scenario
  const { gesture: backSwipeGesture, animatedStyle: backSwipeAnimatedStyle, reset: resetBackSwipe } = useSwipeGesture({
    onSwipeComplete: () => {
      handleNext();
    },
    onSwipeStart: () => HapticPatterns.cardSwipe(),
  });

  // Animate streak pulse when it increases
  useEffect(() => {
    if (streak > previousStreak) {
      streakPulse.value = withSequence(
        withSpring(1.2, { damping: 5, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
    }
    setPreviousStreak(streak);
  }, [streak]);

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

  // Feedback overlay animation
  const feedbackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: feedbackOpacity.value,
  }));

  // Select answer and immediately show solution
  const handleAnswerSelect = (answer: Answer) => {
    // Allow re-answering after flip back (isFlipped will be false)
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
      addXP(currentScenario.xpReward);
      incrementStreak();
      incrementCorrect();
      // Streak milestone haptic at level 5
      if (streak + 1 >= 5) {
        HapticPatterns.streakMilestone();
      }
    } else {
      backgroundRef.current?.flashRed();
      resetStreak();
    }
  };

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

  // Advance to next scenario
  const handleNext = () => {
    setIsFlipped(false);
    setSelectedAnswer(null);
    setIsCorrect(false);
    flipRotation.value = 0;
    borderColorState.value = 0; // Reset to silver
    resetSwipe();
    resetBackSwipe();

    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(currentScenarioIndex + 1);
    } else {
      setCurrentScenarioIndex(0); // Loop back
    }
  };

  function handleSkip() {
    HapticPatterns.cardSwipe();
    handleNext();
  }

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
          <Text style={styles.title}>Improve</Text>
          <View style={styles.headerRight}>
            {/* Scenario progress */}
            <View style={styles.progressChip}>
              <Text style={styles.progressText}>
                {currentScenarioIndex + 1} / {scenarios.length}
              </Text>
            </View>
            {/* Streak indicator with pulse animation */}
            <Animated.View style={[styles.streakChipContainer, streakAnimatedStyle]}>
              <GlassPanel style={[styles.streakChip, streak >= 5 && styles.streakChipGlow]}>
                <Ionicons
                  name="flame"
                  size={16}
                  color={streak >= 5 ? theme.colors.warning : theme.colors.textSecondary}
                />
                <Text style={[styles.streakText, streak >= 5 && styles.streakTextGlow]}>
                  {streak}
                </Text>
              </GlassPanel>
            </Animated.View>
          </View>
        </View>

        {/* Scenario Card Container with padding */}
        <View style={styles.cardContainerWrapper}>
          <View style={styles.cardContainer}>
            {/* Loading State */}
            {isLoading && <ScenarioCardSkeleton />}

            {/* Empty State */}
            {!isLoading && scenarios.length === 0 && <EmptyState />}

            {/* Scenario Card - only show when loaded and has scenarios */}
            {!isLoading && scenarios.length > 0 && currentScenario && (
              <>
                {/* Static Gradient Border */}
                <View style={styles.gradientBorderContainer}>
                  <StaticGradientBorder colorState={borderColorState} />
                  <View style={styles.gradientBorderInner} />
                </View>
                
                {/* Front of card */}
                <Animated.View style={[styles.card, frontAnimatedStyle, swipeAnimatedStyle]}>
                  <View style={styles.cardContent}>
                    {/* Top section: Chart - swipeable area */}
                    <GestureDetector gesture={swipeGesture}>
                      <View style={styles.chartSection}>
                        <CandlestickChart
                          tradingPair={currentScenario.tradingPair}
                          timeframe={currentScenario.timeframe}
                          seed={currentScenario.id}
                          showOutcome={null}
                        />
                      </View>
                    </GestureDetector>

                  {/* Bottom section: Split left/right - NOT wrapped in gesture detector for button clickability */}
                  <View style={styles.bottomSection}>
                    {/* Left: Scenario text */}
                    <View style={styles.scenarioContainer}>
                      <Text style={styles.scenarioLabel}>SCENARIO</Text>
                      <Text style={styles.scenarioText}>
                        {currentScenario.economicContext}
                      </Text>
                    </View>

                    {/* Right: Action buttons (vertical stack) */}
                    <View style={styles.actionsContainer}>
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

                  {/* Skip button in corner */}
                  <Pressable style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                </View>
              </Animated.View>

            {/* Back of card (Solution) - also swipeable */}
            <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle, backSwipeAnimatedStyle]}>
              <View style={styles.cardContent}>
                {/* Top section: Solution chart with outcome */}
                <GestureDetector gesture={backSwipeGesture}>
                  <View style={styles.chartSection}>
                    <CandlestickChart
                      tradingPair={currentScenario.tradingPair}
                      timeframe={currentScenario.timeframe}
                      seed={`${currentScenario.id}-solution`}
                      showOutcome={currentScenario.correctAnswer as 'up' | 'down'}
                    />
                    {/* Result overlay on chart */}
                    <View style={[
                      styles.resultOverlay,
                      isCorrect ? styles.resultOverlayCorrect : styles.resultOverlayIncorrect
                    ]}>
                      <Ionicons
                        name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                        size={32}
                        color={isCorrect ? theme.colors.success : theme.colors.error}
                      />
                      <Text style={[
                        styles.resultOverlayText,
                        { color: isCorrect ? theme.colors.success : theme.colors.error }
                      ]}>
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                      </Text>
                      {isCorrect && (
                        <Text style={styles.xpText}>+{currentScenario.xpReward} XP</Text>
                      )}
                    </View>
                  </View>
                </GestureDetector>

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
                      label="Try Again"
                      icon="refresh"
                      variant="secondary"
                      onPress={handleFlipBack}
                    />
                    <LiquidGlassButton
                      label="Next"
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
          </View>
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

// Static Gradient Border Component - like the screenshot with colorful border
interface StaticGradientBorderProps {
  colorState: Animated.SharedValue<number>;
}

const StaticGradientBorder: React.FC<StaticGradientBorderProps> = ({ colorState }) => {
  return (
    <View style={styles.gradientBorderStack}>
      {/* Silver gradient (neutral) - multicolor like screenshot but silver tones */}
      <Animated.View style={[StyleSheet.absoluteFill, useAnimatedStyle(() => ({
        opacity: interpolate(Math.abs(colorState.value), [0, 1], [1, 0]),
      }))]}>
        <LinearGradient
          colors={['#E8E8E8', '#C0C0C0', '#A8A8A8', '#D4D4D4', '#B8B8B8', '#E0E0E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Green gradient (correct) */}
      <Animated.View style={[StyleSheet.absoluteFill, useAnimatedStyle(() => ({
        opacity: interpolate(colorState.value, [0, 1], [0, 1]),
      }))]}>
        <LinearGradient
          colors={['#00E676', '#69F0AE', '#00C853', '#A5D6A7', '#4CAF50', '#81C784']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      
      {/* Red gradient (incorrect) */}
      <Animated.View style={[StyleSheet.absoluteFill, useAnimatedStyle(() => ({
        opacity: interpolate(colorState.value, [-1, 0], [1, 0]),
      }))]}>
        <LinearGradient
          colors={['#FF5252', '#FF8A80', '#F44336', '#FFCDD2', '#E57373', '#EF9A9A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
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
  const icon = isUp ? 'trending-up' : 'trending-down';

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.upDownButton,
        { borderColor: `${buttonColor}40` },
        selected && { borderColor: buttonColor, backgroundColor: `${buttonColor}25` },
        disabled && styles.upDownButtonDisabled,
        animatedStyle,
      ]}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      {/* Colored glow overlay */}
      <View 
        style={[
          styles.buttonGlowOverlay, 
          { backgroundColor: `${buttonColor}15` }
        ]} 
        pointerEvents="none" 
      />
      <View style={styles.upDownButtonContent} pointerEvents="none">
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={selected ? buttonColor : (disabled ? theme.colors.textTertiary : buttonColor)}
        />
        <Text style={[
          styles.upDownButtonText,
          { color: selected ? buttonColor : (disabled ? theme.colors.textTertiary : buttonColor) },
        ]}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

// Liquid Glass Button Component
interface LiquidGlassButtonProps {
  label: string;
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        selected && { borderColor: activeColor, backgroundColor: `${activeColor}20` },
        disabled && styles.glassButtonDisabled,
        animatedStyle,
      ]}
    >
      <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.glassButtonContent} pointerEvents="none">
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={selected ? activeColor : (disabled ? theme.colors.textTertiary : theme.colors.textPrimary)}
          />
        )}
        <Text style={[
          styles.glassButtonText,
          selected && { color: activeColor },
          disabled && styles.glassButtonTextDisabled,
        ]}>
          {label}
        </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100, // Large bottom padding to avoid menu overlap
  },
  // Card container
  cardContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  // Gradient border styles - static border like screenshot
  gradientBorderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  card: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: theme.borderRadius.xl - 2,
    overflow: 'hidden',
  },
  cardBack: {
    backfaceVisibility: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 14, 0.98)',
    borderRadius: theme.borderRadius.xl - 2,
  },
  // Chart section (larger portion of card)
  chartSection: {
    flex: 3,
    minHeight: 0,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  // Bottom section - text and buttons
  bottomSection: {
    flex: 2,
    minHeight: 0,
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  // Scenario (left side)
  scenarioContainer: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
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
    width: 110,
    justifyContent: 'flex-start',
    gap: theme.spacing.sm,
    zIndex: 10, // Ensure buttons are above other elements
  },
  // Up/Down Button styles
  upDownButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  upDownButtonDisabled: {
    opacity: 0.4,
  },
  buttonGlowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.md,
  },
  upDownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  upDownButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  // Skip button
  skipButton: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  skipText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
  },
  // Result overlay on solution chart
  resultOverlay: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  resultOverlayCorrect: {
    backgroundColor: theme.colors.successMuted,
  },
  resultOverlayIncorrect: {
    backgroundColor: theme.colors.errorMuted,
  },
  resultOverlayText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  xpText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.accent,
    marginLeft: theme.spacing.xs,
  },
  // Analysis section (solution back)
  analysisContainer: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
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
    marginTop: 'auto',
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
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  glassButtonPrimary: {
    borderColor: theme.colors.glassBorder,
    backgroundColor: theme.colors.glassBackground,
  },
  glassButtonSecondary: {
    borderColor: theme.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  glassButtonDisabled: {
    opacity: 0.4,
  },
  glassButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 40,
  },
  glassButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  glassButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
});
