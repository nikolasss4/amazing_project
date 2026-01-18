/**
 * TradeScreen - Unified "Choose Your Trade" interface
 * 
 * Users can build a bet with up to 10 trades, each with:
 * - An asset (traded against USDC)
 * - A direction (up or down)
 * - A weight allocation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
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
import { TradeService, PearOpenPosition, PearAssetPosition } from '../services/TradeService';
import { TradingViewChart } from '../components/TradingViewChart';
import { Avatar } from '../../community/components/Avatar';

const QUICK_AMOUNTS = [10, 50, 100, 500];
const MAX_TRADES = 10;

// Available assets (crypto coins only, all traded against USDC)
const AVAILABLE_ASSETS = ['BTC', 'ETH', 'SOL', 'HYPE', 'ARB', 'XRP', 'BNB'];

// Token logos mapping (using reliable CDN URLs)
const TOKEN_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  HYPE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
};

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
  const [successMessage, setSuccessMessage] = useState<string>('Your trade is being executed');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState<string | null>(null); // tradeId
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletInputAddress, setWalletInputAddress] = useState('');
  const [walletPrivateKey, setWalletPrivateKey] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());

  // Open positions state
  const [openPositions, setOpenPositions] = useState<PearOpenPosition[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

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
  const { isConnected, walletAddress, connect, disconnect, initialize, getAccessToken } = useWalletStore();

  // Mock positions data for demonstration
  const MOCK_POSITIONS: PearOpenPosition[] = [
    {
      positionId: 'pos_btc_eth_combo_001',
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      pearExecutionFlag: 'executed',
      stopLoss: null,
      takeProfit: null,
      entryRatio: 1.0,
      markRatio: 1.04,
      entryPriceRatio: 1.0,
      markPriceRatio: 1.04,
      entryPositionValue: 50.00,
      positionValue: 52.00,
      marginUsed: 10.00,
      unrealizedPnl: 2.00,
      unrealizedPnlPercentage: 0.04,
      longAssets: [{ coin: 'BTC', entryPrice: 42150.00, actualSize: 0.00071, leverage: 5, marginUsed: 6, positionValue: 31.20, unrealizedPnl: 1.20, entryPositionValue: 30, initialWeight: 60, fundingPaid: 0.01 }],
      shortAssets: [{ coin: 'ETH', entryPrice: 2580.00, actualSize: 0.00775, leverage: 5, marginUsed: 4, positionValue: 20.80, unrealizedPnl: 0.80, entryPositionValue: 20, initialWeight: 40, fundingPaid: 0.01 }],
      createdAt: '2026-01-15T10:30:00Z',
      updatedAt: '2026-01-18T14:22:00Z',
    },
    {
      positionId: 'pos_xrp_bnb_sol_002',
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      pearExecutionFlag: 'executed',
      stopLoss: null,
      takeProfit: null,
      entryRatio: 1.0,
      markRatio: 0.97,
      entryPriceRatio: 1.0,
      markPriceRatio: 0.97,
      entryPositionValue: 100.00,
      positionValue: 97.00,
      marginUsed: 20.00,
      unrealizedPnl: -3.00,
      unrealizedPnlPercentage: -0.03,
      longAssets: [
        { coin: 'BNB', entryPrice: 312.00, actualSize: 0.064, leverage: 5, marginUsed: 4, positionValue: 19.60, unrealizedPnl: -0.40, entryPositionValue: 20, initialWeight: 20, fundingPaid: 0.01 },
        { coin: 'SOL', entryPrice: 185.00, actualSize: 0.054, leverage: 5, marginUsed: 2, positionValue: 10.30, unrealizedPnl: 0.30, entryPositionValue: 10, initialWeight: 10, fundingPaid: 0.01 },
      ],
      shortAssets: [{ coin: 'XRP', entryPrice: 2.45, actualSize: 28.57, leverage: 5, marginUsed: 14, positionValue: 67.10, unrealizedPnl: -2.90, entryPositionValue: 70, initialWeight: 70, fundingPaid: 0.02 }],
      createdAt: '2026-01-16T15:45:00Z',
      updatedAt: '2026-01-18T14:22:00Z',
    },
    {
      positionId: 'pos_btc_2024_003',
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      pearExecutionFlag: 'executed',
      stopLoss: null,
      takeProfit: null,
      entryRatio: 1.0,
      markRatio: 1.05,
      entryPriceRatio: 42150.00,
      markPriceRatio: 43250.00,
      entryPositionValue: 50.00,
      positionValue: 53.75,
      marginUsed: 10.00,
      unrealizedPnl: 3.75,
      unrealizedPnlPercentage: 0.075,
      longAssets: [{ coin: 'BTC', entryPrice: 42150.00, actualSize: 0.00118, leverage: 5, marginUsed: 10, positionValue: 53.75, unrealizedPnl: 3.75, entryPositionValue: 50, initialWeight: 100, fundingPaid: 0.01 }],
      shortAssets: [],
      createdAt: '2026-01-17T09:15:00Z',
      updatedAt: '2026-01-18T14:22:00Z',
    },
  ];

  // Load mock positions (no actual API call)
  const fetchOpenPositions = useCallback(async () => {
    console.log('Loading mock positions...');
    setIsLoadingPositions(true);
    setPositionsError(null);
    
    // Simulate a brief loading state
    setTimeout(() => {
      setOpenPositions(MOCK_POSITIONS);
      setIsLoadingPositions(false);
      console.log(`Loaded ${MOCK_POSITIONS.length} mock positions`);
    }, 500);
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Fetch positions on mount and when wallet connects
  useEffect(() => {
    fetchOpenPositions();
  }, [fetchOpenPositions, isConnected]);

  const formatAddress = (address: string | null): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    setIsConnectingWallet(true);
    try {
      console.log('Connecting wallet:', walletInputAddress);
      await connect(walletInputAddress, walletPrivateKey);
      console.log('Wallet connected successfully!');
      setWalletInputAddress('');
      setWalletPrivateKey('');
      setShowWalletModal(false);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setWalletError(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setIsConnectingWallet(false);
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

      console.log('Placing trade with order:', JSON.stringify(order, null, 2));
      console.log('Wallet address:', walletAddress);

      const response = await TradeService.submitOrder(order as any, walletAddress || '');

      console.log('Trade response:', JSON.stringify(response, null, 2));

      if (response.success) {
        // Build detailed success message
        let msg = response.message || 'Trade submitted successfully!';
        if (response.orderId) {
          msg += ` Order ID: ${response.orderId}`;
        }
        if (response.positionId) {
          msg += ` Position ID: ${response.positionId}`;
        }
        setSuccessMessage(msg);
        setShowSuccess(true);
        
        // Refresh open positions after successful trade
        fetchOpenPositions();
        
        setTimeout(() => {
          setShowSuccess(false);
          setAmount('');
          // Reset to single empty trade
          setTrades([{ id: generateId(), asset: null, direction: null, weight: 100 }]);
        }, 3000);
      } else {
        // Show detailed error message
        const errorMsg = response.error || 'Trade failed. Please try again.';
        console.error('Trade failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error. Please check your connection.';
      console.error('Trade error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  // Render a single trade card
  const renderTradeCard = (trade: BetTrade, index: number) => {
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
                  <View style={styles.selectedAssetLeft}>
                    <View style={styles.selectedAssetLogoContainer}>
                      <Image 
                        source={{ uri: TOKEN_LOGOS[trade.asset] }} 
                        style={styles.selectedAssetLogo}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.selectedAssetText}>{trade.asset}/USDC</Text>
                  </View>
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

            {/* Chart toggle button - only show when asset is selected */}
            {hasAsset && (
              <Pressable
                onPress={() => toggleChart(trade.id)}
                style={styles.chartToggleButton}
              >
                <Ionicons 
                  name={isChartExpanded ? "chevron-up" : "analytics-outline"} 
                  size={14} 
                  color="#8B5CF6" 
                />
                <Text style={styles.chartToggleText}>
                  {isChartExpanded ? 'Hide Chart' : 'View Chart'}
                </Text>
              </Pressable>
            )}

            {/* Expanded Chart Section - appears between chart button and direction buttons */}
            {isChartExpanded && hasAsset && (
              <View style={styles.chartsSection}>
                <Text style={styles.chartLabel}>{trade.asset}/USDC</Text>
                <View style={styles.singleChartContainer}>
                  <TradingViewChart symbol={`${trade.asset}USDC`} interval="D" />
                </View>
              </View>
            )}

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
                      size={16} 
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
                      size={16} 
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
          </View>

        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background gradients */}
      <LinearGradient
        colors={['#050A14', '#0A0F1E', '#0F1428', '#0A0F1E', '#050812']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.15)', 'rgba(96, 165, 250, 0.08)', 'transparent', 'rgba(59, 130, 246, 0.12)', 'rgba(124, 58, 237, 0.10)']}
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
          {/* Header - Profile and Wallet */}
          <View style={styles.header}>
            <View style={styles.profileWalletContainer}>
              {/* Profile Picture */}
              <Avatar
                userId="3"
                username="TechBull"
                size={48}
                isYou={true}
              />
              {/* Wallet Connection */}
              {isConnected ? (
                <Pressable style={styles.walletButton} onPress={() => setShowWalletModal(true)}>
                  <Ionicons name="wallet" size={18} color="#8B5CF6" />
                  <Text style={styles.walletText}>{formatAddress(walletAddress)}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.connectButton} onPress={() => setShowWalletModal(true)}>
                  <Ionicons name="wallet-outline" size={18} color="#8B5CF6" />
                  <Text style={styles.connectText}>Connect</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Choose Your Trade Section */}
          <GlowingBorder
            style={styles.mainPanel}
            glowColor="rgba(139, 92, 246, 0.4)"
            gradientColors={['#8B5CF6', '#60A5FA', '#3B82F6', '#8B5CF6', '#7C3AED', '#60A5FA', '#8B5CF6']}
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
                <Text style={styles.sectionLabel}>Choose Your Bet</Text>
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
                  <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
                  <Text style={styles.addTradeText}>Add Another Trade</Text>
                </Pressable>
              )}
            </View>
          </GlowingBorder>

          {/* Amount & Place Bet */}
          <GlowingBorder
            style={styles.tradeTicket}
            glowColor="rgba(96, 165, 250, 0.4)"
            gradientColors={['#8B5CF6', '#60A5FA', '#3B82F6', '#8B5CF6', '#7C3AED', '#60A5FA', '#8B5CF6']}
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
                  <Ionicons name="information-circle" size={16} color="#8B5CF6" />
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

          {/* Open Positions Section */}
          <GlowingBorder
            style={styles.positionsPanel}
            glowColor="rgba(124, 58, 237, 0.4)"
            gradientColors={['#8B5CF6', '#60A5FA', '#3B82F6', '#8B5CF6', '#7C3AED', '#60A5FA', '#8B5CF6']}
            disabled={false}
            glow={false}
            spread={8}
            proximity={0}
            inactiveZone={0.7}
            movementDuration={2000}
            borderWidth={0.15}
          >
            <View style={styles.positionsPanelContent}>
              <View style={styles.positionsHeader}>
                <Text style={styles.sectionLabel}>Open Positions</Text>
                <Pressable onPress={fetchOpenPositions} style={styles.refreshButton}>
                  {isLoadingPositions ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="#8B5CF6" />
                  )}
                </Pressable>
              </View>

              {/* Loading State */}
              {isLoadingPositions && openPositions.length === 0 && (
                <View style={styles.positionsLoading}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.positionsLoadingText}>Loading positions...</Text>
                </View>
              )}

              {/* Error State */}
              {positionsError && !isLoadingPositions && (
                <View style={styles.positionsError}>
                  <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
                  <Text style={styles.positionsErrorText}>{positionsError}</Text>
                  <Pressable onPress={fetchOpenPositions} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {/* Empty State */}
              {!isLoadingPositions && !positionsError && openPositions.length === 0 && (
                <View style={styles.positionsEmpty}>
                  <Ionicons name="layers-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={styles.positionsEmptyText}>No open positions</Text>
                  <Text style={styles.positionsEmptySubtext}>
                    Place a bet above to open your first position
                  </Text>
                </View>
              )}

              {/* Positions List */}
              {!isLoadingPositions && openPositions.length > 0 && (
                <View style={styles.positionsList}>
                  {openPositions.map((position) => {
                    const isProfitable = position.unrealizedPnl >= 0;
                    const pnlColor = isProfitable ? theme.colors.bullish : theme.colors.bearish;
                    
                    // Get asset names
                    const longAssetNames = position.longAssets.map(a => a.coin).join(', ');
                    const shortAssetNames = position.shortAssets.map(a => a.coin).join(', ');
                    
                    return (
                      <View key={position.positionId} style={styles.positionCard}>
                        {/* Position Header */}
                        <View style={styles.positionHeader}>
                          <View style={styles.positionAssets}>
                            {longAssetNames && (
                              <View style={styles.positionAssetTag}>
                                <Ionicons name="arrow-up" size={12} color={theme.colors.bullish} />
                                <Text style={styles.positionAssetTagText}>{longAssetNames}</Text>
                              </View>
                            )}
                            {shortAssetNames && (
                              <View style={[styles.positionAssetTag, styles.positionAssetTagShort]}>
                                <Ionicons name="arrow-down" size={12} color={theme.colors.bearish} />
                                <Text style={styles.positionAssetTagText}>{shortAssetNames}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.positionId}>
                            {position.positionId.substring(0, 8)}...
                          </Text>
                        </View>

                        {/* Position Stats */}
                        <View style={styles.positionStats}>
                          <View style={styles.positionStat}>
                            <Text style={styles.positionStatLabel}>Current Value</Text>
                            <Text style={styles.positionStatValue}>
                              ${position.positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </View>
                          <View style={styles.positionStat}>
                            <Text style={styles.positionStatLabel}>Entry Value</Text>
                            <Text style={styles.positionStatValue}>
                              ${position.entryPositionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </View>
                        </View>

                        {/* PnL Row */}
                        <View style={styles.positionPnlRow}>
                          <Text style={styles.positionPnlLabel}>Unrealized PnL</Text>
                          <View style={styles.positionPnlValues}>
                            <Text style={[styles.positionPnlValue, { color: pnlColor }]}>
                              {isProfitable ? '+' : ''}${position.unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                            <Text style={[styles.positionPnlPercent, { color: pnlColor }]}>
                              ({isProfitable ? '+' : ''}{(position.unrealizedPnlPercentage * 100).toFixed(2)}%)
                            </Text>
                          </View>
                        </View>

                        {/* Position Footer */}
                        <View style={styles.positionFooter}>
                          <Text style={styles.positionDate}>
                            Opened: {new Date(position.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
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
            <Text style={styles.successSubtext}>{successMessage}</Text>
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
      <Modal visible={showAssetSelector !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAssetSelector(null)}>
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.assetModalAnimated}>
            <GlassPanel style={styles.assetModal}>
              <View style={styles.assetModalHeader}>
                <Text style={styles.assetModalTitle}>Select Asset</Text>
                <Pressable onPress={() => setShowAssetSelector(null)} style={styles.modalCloseButton}>
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
                      <View style={styles.assetItemRow}>
                        <View style={styles.assetLogoContainer}>
                          <Image 
                            source={{ uri: TOKEN_LOGOS[asset] }} 
                            style={styles.assetLogo}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.assetItemContent}>
                          <Text style={styles.assetItemSymbol}>{asset}</Text>
                          <Text style={styles.assetItemPair}>{asset}/USDC</Text>
                        </View>
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
              setWalletPrivateKey('');
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
                  <Ionicons name="wallet-outline" size={48} color="#8B5CF6" />
                  <Text style={styles.walletDescription}>
                    Enter your wallet address and private key to authenticate and start trading
                  </Text>
                  
                  {/* Wallet Address Input */}
                  <View style={styles.inputFieldContainer}>
                    <Text style={styles.inputFieldLabel}>Wallet Address</Text>
                    <TextInput
                      style={styles.walletInput}
                      value={walletInputAddress}
                      onChangeText={(text) => {
                        setWalletInputAddress(text);
                        setWalletError(null);
                      }}
                      placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f..."
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isConnectingWallet}
                    />
                  </View>
                  
                  {/* Private Key Input */}
                  <View style={styles.inputFieldContainer}>
                    <Text style={styles.inputFieldLabel}>Private Key</Text>
                    <TextInput
                      style={styles.walletInput}
                      value={walletPrivateKey}
                      onChangeText={(text) => {
                        setWalletPrivateKey(text);
                        setWalletError(null);
                      }}
                      placeholder="a1b2c3d4e5f67890abcdef1234567890abcdef12345678XXXXXX"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={true}
                      editable={!isConnectingWallet}
                    />
                    <Text style={styles.privateKeyHint}>
                      64 hex characters (without 0x prefix)
                    </Text>
                  </View>
                  
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
                    disabled={!walletInputAddress || !walletPrivateKey || isConnectingWallet}
                    loading={isConnectingWallet}
                  >
                    {isConnectingWallet ? 'Authenticating...' : 'Connect & Authenticate'}
                  </Button>
                  {isConnectingWallet && (
                    <Text style={styles.connectingHint}>
                      Connecting to backend for authentication...
                    </Text>
                  )}
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
    marginBottom: theme.spacing.xl,
  },
  profileWalletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  walletText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  connectText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
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
    color: '#8B5CF6',
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
    color: '#8B5CF6',
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
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
    borderStyle: 'solid',
  },
  selectedAssetDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  selectedAssetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedAssetLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  selectedAssetLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  directionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
    textAlign: 'center',
  },
  directionChoices: {
    flexDirection: 'row',
    gap: 10,
  },
  directionChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
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
    fontSize: 13,
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
    gap: 5,
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  chartToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },

  // Charts section
  chartsSection: {
    marginTop: 12,
    marginBottom: 4,
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
    height: 320,
    minHeight: 320,
    borderRadius: 12,
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderStyle: 'dashed',
  },
  addTradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  quickAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  quickAmountTextActive: {
    color: '#8B5CF6',
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#8B5CF6',
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
  assetModalAnimated: {
    width: '100%',
    alignItems: 'center',
  },
  assetModal: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '75%',
    padding: 20,
    borderRadius: 20,
  },
  assetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  assetModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetList: {
    maxHeight: 450,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  assetItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
  },
  assetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  assetLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  assetItemContent: {
    flex: 1,
  },
  assetItemSymbol: {
    fontSize: 17,
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
  connectingHint: {
    marginTop: 12,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  inputFieldContainer: {
    width: '100%',
    marginBottom: 8,
  },
  inputFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  privateKeyHint: {
    marginTop: 4,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Open Positions Styles
  positionsPanel: {
    padding: 2,
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  positionsPanelContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
  },
  positionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  positionsLoading: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  positionsLoadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  positionsError: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  positionsErrorText: {
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  positionsEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  positionsEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  positionsEmptySubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
  positionsList: {
    gap: 12,
  },
  positionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionAssets: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  positionAssetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  positionAssetTagShort: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  positionAssetTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  positionId: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'monospace',
  },
  positionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  positionStat: {
    flex: 1,
    alignItems: 'center',
  },
  positionStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
  },
  positionStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  positionPnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionPnlLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  positionPnlValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionPnlValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  positionPnlPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  positionFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  positionDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
