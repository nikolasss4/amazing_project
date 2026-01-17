import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';
import { useTradeStore } from '@app/store';
import { mockTradePairs, mockThemes, TradeTheme, TradePair } from '../models';
import { TradingViewChart } from '../components/TradingViewChart';
import { TradeService } from '../services/TradeService';

const QUICK_AMOUNTS = [10, 50, 100, 500];

export const TradeScreen: React.FC = () => {
  const {
    selectedTheme,
    selectedPair,
    tradeType,
    orderType,
    amount,
    side,
    setSelectedTheme,
    setSelectedPair,
    setTradeType,
    setOrderType,
    setAmount,
    setSide,
  } = useTradeStore();

  const [showChart, setShowChart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceTrade = async () => {
    if (!canPlaceTrade() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null); // Clear any previous errors

    try {
      // Build trade order
      const order = {
        type: tradeType === 'theme' ? 'theme' : 'single',
        theme: tradeType === 'theme' ? selectedTheme : undefined,
        pair: tradeType === 'single' ? selectedPair : undefined,
        side,
        orderType,
        amount: parseFloat(amount),
      };

      // Submit to Pear Execution API
      const response = await TradeService.submitOrder(order);

      if (response.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAmount('');
        }, 2000);
      } else {
        // Show error modal with user-friendly message
        const errorMessage = getUserFriendlyError(response.error);
        setError(errorMessage);
      }
    } catch (error) {
      // Handle network errors, timeouts, etc.
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error instanceof Error) {
        // Provide more specific error messages
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const getTradeDescription = () => {
    if (tradeType === 'theme' && selectedTheme) {
      if (selectedTheme.type === 'pair') {
        return `Bet on ${selectedTheme.longAsset} going up vs ${selectedTheme.shortAsset} going down`;
      }
      return side === 'long'
        ? `Bet on ${selectedTheme.name} going up`
        : `Bet on ${selectedTheme.name} going down`;
    }
    if (tradeType === 'single' && selectedPair) {
      return side === 'long'
        ? `Bet on ${selectedPair.displayName} going up`
        : `Bet on ${selectedPair.displayName} going down`;
    }
    return 'Select what you want to bet on';
  };

  const canPlaceTrade = () => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (tradeType === 'theme' && !selectedTheme) return false;
    if (tradeType === 'single' && !selectedPair) return false;
    return true;
  };

  const getSelectedSymbol = () => {
    if (tradeType === 'theme' && selectedTheme) {
      return selectedTheme.tokens[0] || 'BTCUSD';
    }
    if (tradeType === 'single' && selectedPair) {
      return selectedPair.symbol;
    }
    return 'BTCUSD';
  };

  /**
   * Convert API error messages to user-friendly messages
   */
  const getUserFriendlyError = (error: string | undefined): string => {
    if (!error) {
      return 'Failed to place trade. Please try again.';
    }

    // Handle authentication errors
    if (error.includes('401') || error.includes('Unauthorized') || error.includes('authentication')) {
      return 'Authentication required. Please connect your wallet to continue.';
    }

    // Handle validation errors
    if (error.includes('400') || error.includes('Bad Request') || error.includes('invalid')) {
      return 'Invalid trade parameters. Please check your order details and try again.';
    }

    // Handle server errors
    if (error.includes('500') || error.includes('Internal Server Error')) {
      return 'Server error. Please try again in a few moments.';
    }

    // Handle insufficient balance
    if (error.includes('balance') || error.includes('insufficient')) {
      return 'Insufficient balance. Please check your account balance.';
    }

    // Handle amount errors
    if (error.includes('amount') || error.includes('minimum')) {
      return 'Trade amount is too small. Minimum amount is required.';
    }

    // Return original error if no specific handling
    return error;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Place Your Bet</Text>
            <Text style={styles.subtitle}>Trade themes, not just tokens</Text>
          </View>
          <GlassPanel style={styles.balanceChip}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>$10,000</Text>
          </GlassPanel>
        </View>

        {/* Trade Type Selector */}
        <View style={styles.tradeTypeRow}>
          <Pressable
            onPress={() => {
              setTradeType('theme');
              setSelectedPair(null);
            }}
            style={[styles.tradeTypeButton, tradeType === 'theme' && styles.tradeTypeButtonActive]}
          >
            <Text
              style={[
                styles.tradeTypeText,
                tradeType === 'theme' && styles.tradeTypeTextActive,
              ]}
            >
              Themes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setTradeType('single');
              setSelectedTheme(null);
            }}
            style={[styles.tradeTypeButton, tradeType === 'single' && styles.tradeTypeButtonActive]}
          >
            <Text
              style={[
                styles.tradeTypeText,
                tradeType === 'single' && styles.tradeTypeTextActive,
              ]}
            >
              Single Token
            </Text>
          </Pressable>
        </View>

        {/* Theme/Narrative Selector */}
        {tradeType === 'theme' && (
          <GlassPanel style={styles.selectorPanel}>
            <View style={styles.selectorHeader}>
              <Text style={styles.sectionLabel}>Choose a Theme</Text>
              <TouchableOpacity
                onPress={() => setShowInfo('themes')}
                style={styles.infoButton}
              >
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.themeList}
            >
              {mockThemes.map((themeItem) => (
                <Pressable
                  key={themeItem.id}
                  onPress={() => setSelectedTheme(themeItem)}
                  style={[
                    styles.themeCard,
                    selectedTheme?.id === themeItem.id && styles.themeCardActive,
                  ]}
                >
                  <Text style={styles.themeIcon}>{themeItem.icon}</Text>
                  <Text
                    style={[
                      styles.themeName,
                      selectedTheme?.id === themeItem.id && styles.themeNameActive,
                    ]}
                  >
                    {themeItem.name}
                  </Text>
                  <Text style={styles.themeDescription}>{themeItem.description}</Text>
                  <View style={styles.themeChange}>
                    <Text
                      style={[
                        styles.themeChangeText,
                        {
                          color:
                            themeItem.change24h >= 0
                              ? theme.colors.bullish
                              : theme.colors.bearish,
                        },
                      ]}
                    >
                      {themeItem.change24h >= 0 ? '+' : ''}
                      {themeItem.change24h}%
                    </Text>
                  </View>
                  {themeItem.type === 'pair' && (
                    <View style={styles.pairBadge}>
                      <Text style={styles.pairBadgeText}>Pair Trade</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </GlassPanel>
        )}

        {/* Single Pair Selector */}
        {tradeType === 'single' && (
          <GlassPanel style={styles.selectorPanel}>
            <Text style={styles.sectionLabel}>Choose a Token</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pairList}
            >
              {mockTradePairs.map((pair) => (
                <Pressable
                  key={pair.symbol}
                  onPress={() => setSelectedPair(pair)}
                  style={[
                    styles.pairChip,
                    selectedPair?.symbol === pair.symbol && styles.pairChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pairChipText,
                      selectedPair?.symbol === pair.symbol && styles.pairChipTextActive,
                    ]}
                  >
                    {pair.displayName}
                  </Text>
                  <Text
                    style={[
                      styles.pairChange,
                      {
                        color:
                          pair.change24h >= 0 ? theme.colors.bullish : theme.colors.bearish,
                      },
                    ]}
                  >
                    {pair.change24h >= 0 ? '+' : ''}
                    {pair.change24h}%
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </GlassPanel>
        )}

        {/* Trade Description */}
        {(selectedTheme || selectedPair) && (
          <GlassPanel style={styles.descriptionPanel}>
            <Text style={styles.descriptionText}>{getTradeDescription()}</Text>
          </GlassPanel>
        )}

        {/* Chart Toggle */}
        {(selectedTheme || selectedPair) && (
          <Pressable
            onPress={() => setShowChart(!showChart)}
            style={styles.chartToggle}
          >
            <Text style={styles.chartToggleText}>
              {showChart ? 'Hide' : 'Show'} Chart
            </Text>
            <Ionicons
              name={showChart ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        )}

        {/* Chart */}
        {showChart && (selectedTheme || selectedPair) && (
          <View style={styles.chartContainer}>
            <TradingViewChart symbol={getSelectedSymbol()} interval="D" />
          </View>
        )}

        {/* Trade Ticket */}
        <GlassPanel style={styles.tradeTicket}>
          <Text style={styles.sectionLabel}>Your Bet</Text>

          {/* Long/Short Toggle */}
          <View style={styles.sideToggle}>
            <Pressable
              onPress={() => setSide('long')}
              style={[styles.sideButton, side === 'long' && styles.sideButtonLong]}
            >
              <Ionicons
                name="trending-up"
                size={20}
                color={side === 'long' ? '#FFF' : theme.colors.textSecondary}
              />
              <Text
                style={[styles.sideButtonText, side === 'long' && styles.sideButtonTextActive]}
              >
                Bet Up
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSide('short')}
              style={[styles.sideButton, side === 'short' && styles.sideButtonShort]}
            >
              <Ionicons
                name="trending-down"
                size={20}
                color={side === 'short' ? '#FFF' : theme.colors.textSecondary}
              />
              <Text
                style={[styles.sideButtonText, side === 'short' && styles.sideButtonTextActive]}
              >
                Bet Down
              </Text>
            </Pressable>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountRow}>
            <Text style={styles.inputLabel}>Quick Amount</Text>
            <View style={styles.quickAmountButtons}>
              {QUICK_AMOUNTS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => handleQuickAmount(value)}
                  style={[
                    styles.quickAmountButton,
                    amount === value.toString() && styles.quickAmountButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === value.toString() && styles.quickAmountTextActive,
                    ]}
                  >
                    ${value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Custom Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Or Enter Amount (USD)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Order Type (Simplified - Market only for now) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Order Type</Text>
            <View style={styles.orderTypeRow}>
              <Pressable
                onPress={() => setOrderType('market')}
                style={styles.orderTypeOption}
              >
                <View
                  style={[styles.radio, orderType === 'market' && styles.radioActive]}
                />
                <Text style={styles.orderTypeText}>Market (Instant)</Text>
              </Pressable>
            </View>
            <Text style={styles.orderTypeHint}>
              Market orders execute immediately at current price
            </Text>
          </View>

          {/* Place Trade Button */}
          <Button
            variant={side === 'long' ? 'success' : 'error'}
            onPress={handlePlaceTrade}
            fullWidth
            disabled={!canPlaceTrade() || isSubmitting}
            loading={isSubmitting}
            size="lg"
          >
            {isSubmitting
              ? 'Placing Order...'
              : `${side === 'long' ? '🚀 Bet Up' : '📉 Bet Down'} - $${amount || '0.00'}`}
          </Button>

          {/* Risk Warning */}
          <View style={styles.riskWarning}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
            <Text style={styles.riskWarningText}>
              Trading involves risk. Only bet what you can afford to lose.
            </Text>
          </View>
        </GlassPanel>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalOverlay}>
          <GlassPanel style={styles.successModal}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
            <Text style={styles.successText}>Bet Placed! 🎉</Text>
            <Text style={styles.successSubtext}>Your trade is being executed</Text>
          </GlassPanel>
        </Animated.View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={error !== null} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setError(null)}
        >
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <GlassPanel style={styles.errorModal} onStartShouldSetResponder={() => true}>
              <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
              <Text style={styles.errorTitle}>Trade Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
              <View style={styles.errorButtonContainer}>
                <Button
                  onPress={() => setError(null)}
                  variant="primary"
                  fullWidth
                  size="md"
                >
                  OK
                </Button>
              </View>
            </GlassPanel>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Info Modal */}
      <Modal visible={showInfo !== null} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowInfo(null)}
        >
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <GlassPanel style={styles.infoModal} onStartShouldSetResponder={() => true}>
              <Text style={styles.infoTitle}>
                {showInfo === 'themes' ? 'Trading Themes' : 'How It Works'}
              </Text>
              <Text style={styles.infoText}>
                {showInfo === 'themes'
                  ? 'Themes let you bet on groups of tokens or pairs. For example, "AI Tokens" lets you bet on multiple AI-related tokens at once. Pair trades let you bet on one token going up while another goes down.'
                  : 'Choose a theme or token, pick whether you think it will go up or down, set your bet amount, and place your order. It\'s that simple!'}
              </Text>
              <Button onPress={() => setShowInfo(null)} variant="primary" fullWidth>
                Got it!
              </Button>
            </GlassPanel>
          </Animated.View>
        </Pressable>
      </Modal>
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
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  balanceChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  balanceAmount: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  tradeTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  tradeTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  tradeTypeButtonActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  tradeTypeText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  tradeTypeTextActive: {
    color: theme.colors.accent,
  },
  selectorPanel: {
    marginBottom: theme.spacing.lg,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  infoButton: {
    padding: theme.spacing.xs,
  },
  themeList: {
    flexDirection: 'row',
  },
  themeCard: {
    width: 140,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    alignItems: 'center',
  },
  themeCardActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  themeIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  themeName: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  themeNameActive: {
    color: theme.colors.accent,
  },
  themeDescription: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  themeChange: {
    marginTop: 'auto',
  },
  themeChangeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  pairBadge: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.accentMuted,
  },
  pairBadgeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.accent,
    fontWeight: theme.typography.weights.medium,
  },
  pairList: {
    flexDirection: 'row',
  },
  pairChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  pairChipActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  pairChipText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  pairChipTextActive: {
    color: theme.colors.accent,
  },
  pairChange: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  descriptionPanel: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  descriptionText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  chartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  chartToggleText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  chartContainer: {
    height: 300,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  tradeTicket: {
    marginBottom: theme.spacing.lg,
  },
  sideToggle: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sideButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  sideButtonLong: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  sideButtonShort: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  sideButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  sideButtonTextActive: {
    color: '#FFFFFF',
  },
  quickAmountRow: {
    marginBottom: theme.spacing.lg,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  quickAmountButtonActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  quickAmountText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  quickAmountTextActive: {
    color: theme.colors.accent,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  inputPrefix: {
    paddingLeft: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
  },
  orderTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  orderTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.glassBorder,
  },
  radioActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  orderTypeText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textPrimary,
  },
  orderTypeHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  riskWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.warningMuted,
  },
  riskWarningText: {
    flex: 1,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warning,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  successModal: {
    alignItems: 'center',
    minWidth: 280,
    padding: theme.spacing.xl,
  },
  successText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  successSubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  errorModal: {
    minWidth: 300,
    maxWidth: '90%',
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.md,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  errorButtonContainer: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  infoModal: {
    minWidth: 300,
    padding: theme.spacing.xl,
  },
  infoTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.md,
    marginBottom: theme.spacing.lg,
  },
});
