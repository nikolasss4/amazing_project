import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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
import { theme } from '@app/theme';
import { useImproveStore } from '@app/store';
import { mockScenarios, Answer } from '../models';
import { CandlestickChart } from '../components/CandlestickChart';
import { LiquidFireBackground } from '../components/LiquidFireBackground';

export const ImproveScreen: React.FC = () => {
  const { totalXP, streak, addXP, incrementStreak, incrementCorrect, setCurrentScenario } = useImproveStore();
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentScenario = mockScenarios[currentScenarioIndex];
  const flipRotation = useSharedValue(0);

  React.useEffect(() => {
    if (currentScenario) {
      setCurrentScenario(currentScenario);
    }
  }, [currentScenario, setCurrentScenario]);

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

    Haptics.impactAsync(
      correct ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );

    flipRotation.value = withTiming(1, { duration: 600 }, () => {
      runOnJS(setShowResult)(true);
    });

    if (correct) {
      addXP(currentScenario.xpReward);
      incrementStreak();
      incrementCorrect();
    }
  };

  const handleNext = () => {
    setShowResult(false);
    setSelectedAnswer(null);
    flipRotation.value = 0;

    if (currentScenarioIndex < mockScenarios.length - 1) {
      setCurrentScenarioIndex(currentScenarioIndex + 1);
    } else {
      setCurrentScenarioIndex(0);
    }
  };

  const getAnswerIcon = (answer: Answer): keyof typeof Ionicons.glyphMap => {
    return answer === 'up' ? 'trending-up' : 'trending-down';
  };

  const getAnswerColor = (answer: Answer) => {
    return answer === 'up' ? theme.colors.bullish : theme.colors.bearish;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LiquidFireBackground streak={streak} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.progressInfo}>
            <Text style={styles.xpText}>{totalXP} XP</Text>
            <View style={styles.streakContainer}>
              <Ionicons name="flame" size={16} color={theme.colors.bullish} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardContainer}>
          <Animated.View style={[styles.card, frontAnimatedStyle]}>
            <GlassPanel variant="black" style={styles.cardContent}>
              <View style={styles.chartSection}>
                <CandlestickChart
                  tradingPair={currentScenario.tradingPair}
                  timeframe={currentScenario.timeframe}
                  seed={currentScenario.id}
                />
              </View>

              <View style={styles.bottomSection}>
                <ScrollView style={styles.scenarioContainer} nestedScrollEnabled>
                  <View style={styles.scenarioHeader}>
                    <Text style={styles.scenarioLabel}>
                      Scenario {currentScenarioIndex + 1} of {mockScenarios.length}
                    </Text>
                    <Text style={styles.tradingPair}>{currentScenario.tradingPair}</Text>
                  </View>

                  <Text style={styles.economicContext}>{currentScenario.economicContext}</Text>

                  <Text style={styles.questionText}>What happens to the price?</Text>

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
                          size={24}
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
                </ScrollView>
              </View>
            </GlassPanel>
          </Animated.View>

          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
            <GlassPanel variant="black" style={styles.cardContent}>
              <View style={styles.resultContainer}>
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={64}
                  color={isCorrect ? theme.colors.bullish : theme.colors.bearish}
                />
                <Text style={styles.resultText}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </Text>
                <Text style={styles.explanation}>{currentScenario.explanation}</Text>
                {isCorrect && (
                  <View style={styles.rewardContainer}>
                    <Ionicons name="star" size={20} color={theme.colors.bullish} />
                    <Text style={styles.rewardText}>+{currentScenario.xpReward} XP</Text>
                  </View>
                )}
                <Pressable style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextButtonText}>Next Scenario</Text>
                </Pressable>
              </View>
            </GlassPanel>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 24,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cardContainer: {
    width: '100%',
    minHeight: 600,
  },
  card: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  cardBack: {
    backfaceVisibility: 'hidden' as const,
  },
  cardContent: {
    overflow: 'hidden',
    flexDirection: 'column',
    minHeight: 600,
  },
  chartSection: {
    flex: 7,
    minHeight: 0,
    margin: 2,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(5, 5, 5, 0.5)',
  },
  bottomSection: {
    flex: 3,
    minHeight: 0,
    padding: theme.spacing.md,
  },
  scenarioContainer: {
    flex: 1,
    minHeight: 0,
  },
  scenarioHeader: {
    marginBottom: theme.spacing.sm,
  },
  scenarioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tradingPair: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  economicContext: {
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  answersContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  answerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  answerButtonSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  answerText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    minHeight: 600,
  },
  resultText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  explanation: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.xl,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.bullish,
  },
  nextButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 12,
    marginTop: theme.spacing.lg,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
