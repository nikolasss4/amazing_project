import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';
import { useLearnStore } from '@app/store';
import { mockScenarios, Scenario } from '../models';

type Answer = 'up' | 'down' | 'flat';

export const LearnScreen: React.FC = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LearnScreen.tsx:22',message:'LearnScreen component mounted',data:{scenariosCount:mockScenarios.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const { totalXP, streak, addXP, incrementStreak } = useLearnStore();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LearnScreen.tsx:25',message:'LearnStore accessed',data:{totalXP,streak},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentScenario = mockScenarios[currentScenarioIndex];
  const flipRotation = useSharedValue(0);

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

  const handleAnswerSelect = (answer: Answer) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    const correct = answer === currentScenario.correctAnswer;
    setIsCorrect(correct);

    // Safe haptic call - no-op on web
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(
          correct ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
        );
      } catch (error) {
        // Silently fail if haptics are not available
      }
    }

    // Flip card
    flipRotation.value = withTiming(1, { duration: 600 }, () => {
      runOnJS(setShowResult)(true);
    });

    if (correct) {
      addXP(currentScenario.xpReward);
      incrementStreak();
    }
  };

  const handleNext = () => {
    setShowResult(false);
    setSelectedAnswer(null);
    flipRotation.value = 0;

    if (currentScenarioIndex < mockScenarios.length - 1) {
      setCurrentScenarioIndex(currentScenarioIndex + 1);
    } else {
      setCurrentScenarioIndex(0); // Loop back
    }
  };

  const getAnswerIcon = (answer: Answer): keyof typeof Ionicons.glyphMap => {
    switch (answer) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'flat':
        return 'remove';
    }
  };

  const getAnswerColor = (answer: Answer) => {
    switch (answer) {
      case 'up':
        return theme.colors.bullish;
      case 'down':
        return theme.colors.bearish;
      case 'flat':
        return theme.colors.neutral;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Learn</Text>
          <View style={styles.stats}>
            <GlassPanel style={styles.statChip}>
              <Ionicons name="flame" size={16} color={theme.colors.warning} />
              <Text style={styles.statText}>{streak} day streak</Text>
            </GlassPanel>
          </View>
        </View>

        {/* Progress */}
        <GlassPanel style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Total XP</Text>
            <Text style={styles.xpValue}>{totalXP}</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(totalXP % 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressSubtext}>
            {100 - (totalXP % 100)} XP to next level
          </Text>
        </GlassPanel>

        {/* Scenario Card */}
        <View style={styles.cardContainer}>
          {/* Front of card */}
          <Animated.View style={[styles.card, frontAnimatedStyle]}>
            <GlassPanel style={styles.cardContent}>
              <View style={styles.scenarioHeader}>
                <Text style={styles.scenarioLabel}>Scenario {currentScenarioIndex + 1} of {mockScenarios.length}</Text>
              </View>

              <Text style={styles.scenarioPrompt}>{currentScenario.prompt}</Text>

              <View style={styles.questionSection}>
                <Text style={styles.questionText}>
                  What happens to the stock price?
                </Text>
              </View>

              <View style={styles.answersContainer}>
                {currentScenario.options.map((answer) => (
                  <Pressable
                    key={answer}
                    onPress={() => handleAnswerSelect(answer)}
                    style={[
                      styles.answerButton,
                      selectedAnswer === answer && styles.answerButtonSelected,
                    ]}
                    disabled={showResult}
                  >
                    <Ionicons
                      name={getAnswerIcon(answer)}
                      size={32}
                      color={
                        selectedAnswer === answer
                          ? getAnswerColor(answer)
                          : theme.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.answerText,
                        selectedAnswer === answer && { color: getAnswerColor(answer) },
                      ]}
                    >
                      {answer.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </GlassPanel>
          </Animated.View>

          {/* Back of card */}
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
            <GlassPanel style={styles.cardContent}>
              <View style={styles.resultHeader}>
                {isCorrect ? (
                  <>
                    <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
                    <Text style={styles.resultTitle}>Correct!</Text>
                    <Text style={styles.resultSubtext}>
                      +{currentScenario.xpReward} XP
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="close-circle" size={64} color={theme.colors.error} />
                    <Text style={styles.resultTitle}>Not quite</Text>
                    <Text style={styles.resultSubtext}>Keep learning!</Text>
                  </>
                )}
              </View>

              <View style={styles.correctAnswerSection}>
                <Text style={styles.correctAnswerLabel}>Correct answer:</Text>
                <View style={styles.correctAnswerBadge}>
                  <Ionicons
                    name={getAnswerIcon(currentScenario.correctAnswer)}
                    size={24}
                    color={getAnswerColor(currentScenario.correctAnswer)}
                  />
                  <Text style={[styles.correctAnswerText, { color: getAnswerColor(currentScenario.correctAnswer) }]}>
                    {currentScenario.correctAnswer.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.explanationSection}>
                <Text style={styles.explanationLabel}>Explanation</Text>
                <Text style={styles.explanationText}>{currentScenario.explanation}</Text>
              </View>

              <Button onPress={handleNext} fullWidth>
                Next Scenario
              </Button>
            </GlassPanel>
          </Animated.View>
        </View>

        {/* Encouraging message */}
        <Text style={styles.encouragement}>
          {isCorrect
            ? "Nice! You're building intuition. 🎯"
            : "Every mistake is a learning opportunity! 💪"}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
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
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  statText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
  },
  progressCard: {
    marginBottom: theme.spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  progressLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  xpValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.pill,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  progressSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textTertiary,
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardBack: {
    backfaceVisibility: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  scenarioHeader: {
    marginBottom: theme.spacing.lg,
  },
  scenarioLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scenarioPrompt: {
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.sizes.lg * theme.typography.lineHeights.relaxed,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  questionSection: {
    marginBottom: theme.spacing.xl,
  },
  questionText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  answersContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  answerButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: 2,
    borderColor: theme.colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  answerButtonSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentMuted,
  },
  answerText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  resultTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  resultSubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  correctAnswerSection: {
    marginBottom: theme.spacing.xl,
  },
  correctAnswerLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  correctAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.md,
  },
  correctAnswerText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  explanationSection: {
    marginBottom: theme.spacing.xl,
  },
  explanationLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  explanationText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
    color: theme.colors.textPrimary,
  },
  encouragement: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
