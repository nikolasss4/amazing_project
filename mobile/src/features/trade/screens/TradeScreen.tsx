/**
 * TradeScreen - Unified "Choose Your Trade" interface
 * 
 * Users can build a bet with up to 10 trades, each with:
 * - An asset (traded against USDC)
 * - A direction (up or down)
 * - A weight allocation
 */

import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { GlowingBorder } from '@ui/primitives/GlowingBorder';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';
import { useTradeStore, useWalletStore } from '@app/store';
import { TradeService } from '../services/TradeService';
import { TradingViewChart } from '../components/TradingViewChart';

const QUICK_AMOUNTS = [10, 50, 100, 500];
const MAX_TRADES = 10;

// Available assets (all traded against USDC)
const AVAILABLE_ASSETS = ['BTC', 'ETH', 'SOL', 'HYPE', 'ARB'];

// A single trade in the bet
interface BetTrade {
  id: string;
  asset: string | null;
  direction: 'up' | 'down' | null;
  weight: number; // Percentage (1-100)
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export const TradeScreen: React.FC = () => {
  const { amount, setAmount } = useTradeStore();

  // Multi-trade state
  const [trades, setTrades] = useState<BetTrade[]>([
    { id: generateId(), asset: null, direction: null, weight: 100 }
  ]);

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState<string | null>(null); // tradeId
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletInputAddress, setWalletInputAddress] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());

  // Toggle chart expansion for a trade
  const toggleChart = (tradeId: string) => {
    setExpandedCharts(prev => {
      const next = new Set(prev);
      if (next.has(tradeId)) {
        next.delete(tradeId);
      } else {
        next.add(tradeId);
      }
      return next;
    });
  };

  // Wallet state
  const { isConnected, walletAddress, connect, disconnect, initialize } = useWalletStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const formatAddress = (address: string | null): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    try {
      await connect(walletInputAddress);
      setWalletInputAddress('');
      setShowWalletModal(false);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
      setShowWalletModal(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Add a new trade
  const addTrade = () => {
    if (trades.length >= MAX_TRADES) return;
    
    // Calculate remaining weight
    const usedWeight = trades.reduce((sum, t) => sum + t.weight, 0);
    const remainingWeight = Math.max(0, 100 - usedWeight);
    
    setTrades([
      ...trades,
      { id: generateId(), asset: null, direction: null, weight: remainingWeight }
    ]);
  };

  // Remove a trade
  const removeTrade = (id: string) => {
    if (trades.length <= 1) return;
    setTrades(trades.filter(t => t.id !== id));
  };

  // Update a trade
  const updateTrade = (id: string, updates: Partial<BetTrade>) => {
    setTrades(trades.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // Select asset for a trade
  const selectAsset = (asset: string) => {
    if (!showAssetSelector) return;
    
    updateTrade(showAssetSelector, { 
      asset,
      // Reset direction when asset changes
      direction: null
    });
    setShowAssetSelector(null);
  };

  // Auto-balance weights equally
  const autoBalanceWeights = () => {
    const equalWeight = Math.floor(100 / trades.length);
    const remainder = 100 - (equalWeight * trades.length);
    
    setTrades(trades.map((t, index) => ({
      ...t,
      weight: index === 0 ? equalWeight + remainder : equalWeight
    })));
  };

  // Calculate total weight
  const totalWeight = trades.reduce((sum, t) => sum + t.weight, 0);

  // Check if can place trade
  const canPlaceTrade = () => {
    if (!amount || parseFloat(amount) <= 0) return false;
    
    // All trades must be complete
    const allComplete = trades.every(t => 
      t.asset && t.direction && t.weight > 0
    );
    
    if (!allComplete) return false;
    
    // Weights should sum to ~100 (allow small variance)
    if (totalWeight < 95 || totalWeight > 105) return false;
    
    return true;
  };

  // Place the trade
  const handlePlaceTrade = async () => {
    if (!canPlaceTrade() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Build multi-leg order (direction up = long asset, down = short asset)
      const legs = trades.map(t => ({
        longAsset: t.direction === 'up' ? t.asset! : 'USDC',
        shortAsset: t.direction === 'up' ? 'USDC' : t.asset!,
        weight: t.weight,
      }));

      const order = {
        type: 'multi-pair',
        legs,
        amount: parseFloat(amount),
        orderType: 'market',
      };

      const response = await TradeService.submitOrder(order as any, walletAddress || '');

      if (response.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAmount('');
          // Reset to single empty trade
          setTrades([{ id: generateId(), asset: null, direction: null, weight: 100 }]);
        }, 2000);
      } else {
        setError(response.error || 'Trade failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  // Render a single trade card
  const renderTradeCard = (trade: BetTrade, index: number) => {
    const isComplete = trade.asset && trade.direction;
    const isChartExpanded = expandedCharts.has(trade.id);
    const hasAsset = trade.asset !== null;
    
    return (
      <View key={trade.id} style={styles.tradeCard}>
        <View style={styles.tradeCardMain}>
          {/* Left side - Trade controls */}
          <View style={styles.tradeCardLeft}>
            {/* Trade header */}
            <View style={styles.tradeCardHeader}>
              <Text style={styles.tradeCardTitle}>Trade {index + 1}</Text>
              <View style={styles.tradeCardActions}>
                {/* Weight control */}
                <View style={styles.weightControl}>
                  <Pressable
                    onPress={() => updateTrade(trade.id, { weight: Math.max(1, trade.weight - 5) })}
                    style={styles.weightButton}
                  >
                    <Text style={styles.weightButtonText}>-</Text>
                  </Pressable>
                  <Text style={styles.weightValue}>{trade.weight}%</Text>
                  <Pressable
                    onPress={() => updateTrade(trade.id, { weight: Math.min(100, trade.weight + 5) })}
                    style={styles.weightButton}
                  >
                    <Text style={styles.weightButtonText}>+</Text>
                  </Pressable>
                </View>
                {/* Remove button */}
                {trades.length > 1 && (
                  <Pressable onPress={() => removeTrade(trade.id)} style={styles.removeButton}>
                    <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Asset selection */}
            <Pressable
              onPress={() => setShowAssetSelector(trade.id)}
              style={[styles.assetSelector, hasAsset && styles.assetSelectorSelected]}
            >
              {trade.asset ? (
                <View style={styles.selectedAssetDisplay}>
                  <Text style={styles.selectedAssetText}>{trade.asset}/USDC</Text>
                  <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.6)" />
                </View>
              ) : (
                <View style={styles.assetPlaceholder}>
                  <Ionicons name="analytics" size={24} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.assetPlaceholderText}>Select an asset</Text>
                  <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </Pressable>

            {/* Direction choice - only show when asset is selected */}
            {hasAsset && (
              <View style={styles.directionSection}>
                <Text style={styles.directionLabel}>Will {trade.asset} go up or down?</Text>
                <View style={styles.directionChoices}>
                  <Pressable
                    onPress={() => updateTrade(trade.id, { direction: 'up' })}
                    style={[
                      styles.directionChoice,
                      styles.directionChoiceUp,
                      trade.direction === 'up' && styles.directionChoiceUpSelected,
                    ]}
                  >
                    <Ionicons 
                      name="arrow-up" 
                      size={24} 
                      color={trade.direction === 'up' ? '#FFF' : theme.colors.bullish} 
                    />
                    <Text style={[
                      styles.directionChoiceText,
                      styles.directionChoiceTextUp,
                      trade.direction === 'up' && styles.directionChoiceTextSelected,
                    ]}>
                      UP
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateTrade(trade.id, { direction: 'down' })}
                    style={[
                      styles.directionChoice,
                      styles.directionChoiceDown,
                      trade.direction === 'down' && styles.directionChoiceDownSelected,
                    ]}
                  >
                    <Ionicons 
                      name="arrow-down" 
                      size={24} 
                      color={trade.direction === 'down' ? '#FFF' : theme.colors.bearish} 
                    />
                    <Text style={[
                      styles.directionChoiceText,
                      styles.directionChoiceTextDown,
                      trade.direction === 'down' && styles.directionChoiceTextSelected,
                    ]}>
                      DOWN
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Chart toggle button - only show when asset is selected */}
            {hasAsset && (
              <Pressable
                onPress={() => toggleChart(trade.id)}
                style={styles.chartToggleButton}
              >
                <Ionicons 
                  name={isChartExpanded ? "chevron-up" : "analytics-outline"} 
                  size={16} 
                  color="#FF6B35" 
                />
                <Text style={styles.chartToggleText}>
                  {isChartExpanded ? 'Hide Chart' : 'View Chart'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Completion indicator */}
          {isComplete && (
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark" size={12} color="#FFF" />
            </View>
          )}
        </View>

        {/* Expanded Chart Section - chart for asset/USDC */}
        {isChartExpanded && hasAsset && (
          <View style={styles.chartsSection}>
            <Text style={styles.chartLabel}>{trade.asset}/USDC</Text>
            <View style={styles.singleChartContainer}>
              <TradingViewChart symbol={`${trade.asset}USDC`} interval="D" />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background gradients */}
      <LinearGradient
        colors={['#0A0500', '#1A0F00', '#2A1505', '#1A0F00', '#0F0800']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255, 107, 53, 0.15)', 'rgba(255, 140, 60, 0.08)', 'transparent', 'rgba(255, 179, 71, 0.12)', 'rgba(255, 107, 53, 0.10)']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 0.7, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Make Your Bet</Text>
                <Text style={styles.subtitle}>Build your trade with up to {MAX_TRADES} pairs</Text>
              </View>
              {/* Wallet Connection */}
              {isConnected ? (
                <Pressable style={styles.walletButton} onPress={() => setShowWalletModal(true)}>
                  <Text style={styles.walletText}>{formatAddress(walletAddress)}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.connectButton} onPress={() => setShowWalletModal(true)}>
                  <Ionicons name="wallet-outline" size={18} color="#FFF" />
                  <Text style={styles.connectText}>Connect</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Choose Your Trade Section */}
          <GlowingBorder
            style={styles.mainPanel}
            glowColor="rgba(255, 255, 255, 0.2)"
            disabled={false}
            glow={false}
            spread={8}
            proximity={0}
            inactiveZone={0.7}
            movementDuration={2000}
            borderWidth={0.15}
          >
            <View style={styles.mainPanelContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Choose Your Trade</Text>
                <Pressable onPress={autoBalanceWeights} style={styles.balanceButton}>
                  <Text style={styles.balanceButtonText}>Balance Weights</Text>
                </Pressable>
              </View>
              
              {/* Weight indicator */}
              <View style={styles.weightIndicator}>
                <View style={styles.weightBar}>
                  <View 
                    style={[
                      styles.weightBarFill, 
                      { width: `${Math.min(100, totalWeight)}%` },
                      totalWeight > 100 && styles.weightBarOverflow,
                    ]} 
                  />
                </View>
                <Text style={[
                  styles.weightTotal,
                  totalWeight !== 100 && styles.weightTotalWarning,
                ]}>
                  {totalWeight}% allocated
                </Text>
              </View>

              {/* Trade cards */}
              {trades.map((trade, index) => renderTradeCard(trade, index))}

              {/* Add trade button */}
              {trades.length < MAX_TRADES && (
                <Pressable onPress={addTrade} style={styles.addTradeButton}>
                  <Ionicons name="add-circle-outline" size={24} color="#FF6B35" />
                  <Text style={styles.addTradeText}>Add Another Trade</Text>
                </Pressable>
              )}
            </View>
          </GlowingBorder>

          {/* Amount & Place Bet */}
          <GlowingBorder
            style={styles.tradeTicket}
            glowColor="rgba(255, 255, 255, 0.2)"
            disabled={false}
            glow={false}
            spread={8}
            proximity={0}
            inactiveZone={0.7}
            movementDuration={2000}
            borderWidth={0.15}
          >
            <View style={styles.tradeTicketContent}>
              <Text style={styles.sectionLabel}>Your Bet Amount</Text>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountRow}>
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
                <Text style={styles.inputLabel}>Or enter custom amount</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefix}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Place Bet Button */}
              <Button
                variant="success"
                onPress={handlePlaceTrade}
                fullWidth
                disabled={!canPlaceTrade() || isSubmitting}
                loading={isSubmitting}
                size="lg"
              >
                {isSubmitting
                  ? 'Placing Bet...'
                  : canPlaceTrade()
                  ? `Place Bet - $${amount || '0'}`
                  : 'Complete your trades above'}
              </Button>

              {/* Validation hints */}
              {totalWeight !== 100 && trades.length > 0 && (
                <View style={styles.hintBox}>
                  <Ionicons name="information-circle" size={16} color="#FF6B35" />
                  <Text style={styles.hintText}>
                    Weights should total 100% (currently {totalWeight}%)
                  </Text>
                </View>
              )}

              {/* Risk Warning */}
              <View style={styles.riskWarning}>
                <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
                <Text style={styles.riskWarningText}>
                  Trading involves risk. Only trade what you can afford to lose.
                </Text>
              </View>
            </View>
          </GlowingBorder>
        </ScrollView>
      </SafeAreaView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalOverlay}>
          <GlassPanel style={styles.successModal}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
            <Text style={styles.successText}>Bet Placed!</Text>
            <Text style={styles.successSubtext}>Your trade is being executed</Text>
          </GlassPanel>
        </Animated.View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={error !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setError(null)}>
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <GlassPanel style={styles.errorModal}>
              <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Button onPress={() => setError(null)} variant="primary" fullWidth size="md">
                OK
              </Button>
            </GlassPanel>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Asset Selector Modal */}
      <Modal visible={showAssetSelector !== null} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAssetSelector(null)}>
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <GlassPanel style={styles.assetModal}>
              <View style={styles.assetModalHeader}>
                <Text style={styles.assetModalTitle}>Select Asset</Text>
                <Pressable onPress={() => setShowAssetSelector(null)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
              <ScrollView style={styles.assetList} showsVerticalScrollIndicator={false}>
                {AVAILABLE_ASSETS.map((asset) => {
                  // Find current trade to check if this asset is already selected
                  const currentTrade = showAssetSelector 
                    ? trades.find(t => t.id === showAssetSelector)
                    : null;
                  
                  const isSelected = currentTrade?.asset === asset;

                  return (
                    <Pressable
                      key={asset}
                      onPress={() => selectAsset(asset)}
                      style={[styles.assetItem, isSelected && styles.assetItemSelected]}
                    >
                      <View style={styles.assetItemContent}>
                        <Text style={styles.assetItemSymbol}>{asset}</Text>
                        <Text style={styles.assetItemPair}>{asset}/USDC</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </GlassPanel>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Wallet Modal */}
      <Modal visible={showWalletModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setShowWalletModal(false);
              setWalletError(null);
              setWalletInputAddress('');
            }}
          />
          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ zIndex: 1 }}>
            <GlassPanel style={styles.walletModal}>
              <View style={styles.walletModalHeader}>
                <Text style={styles.walletModalTitle}>
                  {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                </Text>
                <Pressable onPress={() => setShowWalletModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              {isConnected ? (
                <View style={styles.walletModalContent}>
                  <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                  <View style={styles.walletAddressBox}>
                    <Text style={styles.walletAddressText}>{walletAddress}</Text>
                  </View>
                  <Button variant="error" onPress={handleDisconnectWallet} fullWidth size="lg">
                    Disconnect
                  </Button>
                </View>
              ) : (
                <View style={styles.walletModalContent}>
                  <Ionicons name="wallet-outline" size={48} color="#FF6B35" />
                  <Text style={styles.walletDescription}>
                    Enter your Ethereum wallet address to start trading
                  </Text>
                  <TextInput
                    style={styles.walletInput}
                    value={walletInputAddress}
                    onChangeText={(text) => {
                      setWalletInputAddress(text);
                      setWalletError(null);
                    }}
                    placeholder="0x..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {walletError && (
                    <View style={styles.walletErrorBox}>
                      <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                      <Text style={styles.walletErrorText}>{walletError}</Text>
                    </View>
                  )}
                  <Button
                    variant="primary"
                    onPress={handleConnectWallet}
                    fullWidth
                    size="lg"
                    disabled={!walletInputAddress}
                  >
                    Connect Wallet
                  </Button>
                </View>
              )}
            </GlassPanel>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },

  // Header
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  walletButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  walletText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  connectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Main Panel
  mainPanel: {
    padding: 2,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  mainPanelContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  balanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Weight indicator
  weightIndicator: {
    marginBottom: theme.spacing.lg,
  },
  weightBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  weightBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  weightBarOverflow: {
    backgroundColor: theme.colors.error,
  },
  weightTotal: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'right',
  },
  weightTotalWarning: {
    color: '#FF6B35',
  },

  // Trade card
  tradeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  tradeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tradeCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  weightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    minWidth: 40,
    textAlign: 'center',
  },
  removeButton: {
    padding: 2,
  },

  // Asset selector
  assetSelector: {
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  assetSelectorSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderColor: '#FF6B35',
    borderStyle: 'solid',
  },
  selectedAssetDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  selectedAssetText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  assetPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  assetPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Direction section
  directionSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  directionLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    textAlign: 'center',
  },
  directionChoices: {
    flexDirection: 'row',
    gap: 12,
  },
  directionChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  directionChoiceUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  directionChoiceDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  directionChoiceUpSelected: {
    backgroundColor: theme.colors.bullish,
    borderColor: theme.colors.bullish,
  },
  directionChoiceDownSelected: {
    backgroundColor: theme.colors.bearish,
    borderColor: theme.colors.bearish,
  },
  directionChoiceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  directionChoiceTextUp: {
    color: theme.colors.bullish,
  },
  directionChoiceTextDown: {
    color: theme.colors.bearish,
  },
  directionChoiceTextSelected: {
    color: '#FFF',
  },
  completeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Trade card layout
  tradeCardMain: {
    position: 'relative',
  },
  tradeCardLeft: {
    flex: 1,
  },

  // Chart toggle button
  chartToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  chartToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },

  // Charts section
  chartsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chartWrapper: {
    flex: 1,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  chartContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  singleChartContainer: {
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },

  // Add trade button
  addTradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderStyle: 'dashed',
  },
  addTradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },

  // Trade ticket
  tradeTicket: {
    padding: 2,
    borderRadius: theme.borderRadius.lg,
  },
  tradeTicketContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
  },
  quickAmountRow: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickAmountButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  quickAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  quickAmountTextActive: {
    color: '#FF6B35',
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputPrefix: {
    paddingLeft: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.md,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B35',
  },
  riskWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.lg,
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.warningMuted,
  },
  riskWarningText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.warning,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  successModal: {
    alignItems: 'center',
    minWidth: 280,
    padding: 32,
  },
  successText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
  },
  successSubtext: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  errorModal: {
    minWidth: 300,
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Asset modal
  assetModal: {
    width: '90%',
    maxHeight: '70%',
    padding: 20,
  },
  assetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assetModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  assetList: {
    maxHeight: 400,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assetItemSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderColor: '#FF6B35',
  },
  assetItemContent: {
    flex: 1,
  },
  assetItemSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  assetItemPair: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Wallet modal
  walletModal: {
    minWidth: 320,
    padding: 24,
  },
  walletModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  walletModalContent: {
    alignItems: 'center',
    gap: 16,
  },
  walletDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  walletAddressBox: {
    width: '100%',
    padding: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  walletAddressText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4CAF50',
    textAlign: 'center',
  },
  walletInput: {
    width: '100%',
    padding: 14,
    fontSize: 14,
    color: '#FFF',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  walletErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
  },
  walletErrorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
  },
});
