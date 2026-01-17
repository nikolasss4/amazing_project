import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Button } from '@ui/primitives/Button';
import { Pill } from '@ui/components/Pill';
import { theme } from '@app/theme';
import { useTradeStore } from '@app/store';
import { mockTradePairs, TradePair } from '../models';
import { TradingViewChart } from '../components/TradingViewChart';

const timeframes = ['1H', '1D', '1W', '1M'];
const timeframeMap: Record<string, string> = {
  '1H': '60',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
};

export const TradeScreen: React.FC = () => {
  const { selectedPair, orderType, amount, setSelectedPair, setOrderType, setAmount } =
    useTradeStore();

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePlaceTrade = () => {
    // TODO: Submit order to backend API
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    setAmount('');
  };

  const handlePairSelect = (pair: TradePair) => {
    setSelectedPair(pair);
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
          <Text style={styles.title}>Trade</Text>
          <GlassPanel style={styles.balanceChip}>
            <Text style={styles.balanceText}>Balance: $10,000</Text>
          </GlassPanel>
        </View>

        {/* Pair Selector */}
        <GlassPanel style={styles.pairSelector}>
          <Text style={styles.sectionLabel}>Select Pair</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pairList}
          >
            {mockTradePairs.map((pair) => (
              <Pressable
                key={pair.symbol}
                onPress={() => handlePairSelect(pair)}
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
                    { color: pair.change24h >= 0 ? theme.colors.bullish : theme.colors.bearish },
                  ]}
                >
                  {pair.change24h >= 0 ? '+' : ''}
                  {pair.change24h}%
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </GlassPanel>

        {/* Chart */}
        {selectedPair && (
          <>
            <View style={styles.timeframeRow}>
              {timeframes.map((tf) => (
                <Pressable
                  key={tf}
                  onPress={() => setSelectedTimeframe(tf)}
                  style={[
                    styles.timeframeChip,
                    selectedTimeframe === tf && styles.timeframeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeframeText,
                      selectedTimeframe === tf && styles.timeframeTextActive,
                    ]}
                  >
                    {tf}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.chartContainer}>
              <TradingViewChart
                symbol={selectedPair.symbol}
                interval={timeframeMap[selectedTimeframe]}
              />
            </View>
          </>
        )}

        {/* Trade Ticket */}
        <GlassPanel style={styles.tradeTicket}>
          <Text style={styles.sectionLabel}>Trade</Text>

          {/* Buy/Sell Toggle */}
          <View style={styles.sideToggle}>
            <Pressable
              onPress={() => setSide('buy')}
              style={[styles.sideButton, side === 'buy' && styles.sideButtonBuy]}
            >
              <Text
                style={[styles.sideButtonText, side === 'buy' && styles.sideButtonTextActive]}
              >
                Buy
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSide('sell')}
              style={[styles.sideButton, side === 'sell' && styles.sideButtonSell]}
            >
              <Text
                style={[styles.sideButtonText, side === 'sell' && styles.sideButtonTextActive]}
              >
                Sell
              </Text>
            </Pressable>
          </View>

          {/* Order Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Order Type</Text>
            <View style={styles.orderTypeRow}>
              <Pressable
                onPress={() => setOrderType('market')}
                style={styles.orderTypeOption}
              >
                <View
                  style={[
                    styles.radio,
                    orderType === 'market' && styles.radioActive,
                  ]}
                />
                <Text style={styles.orderTypeText}>Market</Text>
              </Pressable>
              <Pressable onPress={() => setOrderType('limit')} style={styles.orderTypeOption}>
                <View
                  style={[styles.radio, orderType === 'limit' && styles.radioActive]}
                />
                <Text style={styles.orderTypeText}>Limit</Text>
              </Pressable>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount (USD)</Text>
            <View style={styles.inputContainer}>
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

          {/* Place Trade Button */}
          <Button
            variant={side === 'buy' ? 'success' : 'error'}
            onPress={handlePlaceTrade}
            fullWidth
            disabled={!amount || !selectedPair}
          >
            Place {side === 'buy' ? 'Buy' : 'Sell'} Order
          </Button>
        </GlassPanel>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalOverlay}>
          <GlassPanel style={styles.successModal}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
            <Text style={styles.successText}>Order Placed!</Text>
            <Text style={styles.successSubtext}>Your trade is being executed</Text>
          </GlassPanel>
        </Animated.View>
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
    paddingBottom: 120, // Space for tab bar
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
  balanceChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  balanceText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  pairSelector: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
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
  timeframeRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  timeframeChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  timeframeChipActive: {
    backgroundColor: theme.colors.accentMuted,
    borderColor: theme.colors.accent,
  },
  timeframeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  timeframeTextActive: {
    color: theme.colors.accent,
  },
  chartContainer: {
    height: 400,
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
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  sideButtonBuy: {
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.success,
  },
  sideButtonSell: {
    backgroundColor: theme.colors.errorMuted,
    borderColor: theme.colors.error,
  },
  sideButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  sideButtonTextActive: {
    color: theme.colors.textPrimary,
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
  orderTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
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
  inputContainer: {
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  input: {
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModal: {
    alignItems: 'center',
    minWidth: 280,
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
  },
});
