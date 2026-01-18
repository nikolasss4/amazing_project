import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { GlowingBorder } from '@ui/primitives/GlowingBorder';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';
import { useTradeStore } from '@app/store';
import { mockTradePairs, mockThemes, basketThemes } from '../models';
import { TradingViewChart } from '../components/TradingViewChart';
import { TradeService } from '../services/TradeService';
import { AssetService, Instrument } from '../services/AssetService';

const QUICK_AMOUNTS = [10, 50, 100, 500];

export const TradeScreen: React.FC = () => {
  const {
    selectedTheme,
    selectedPair,
    tradeType,
    orderType,
    amount,
    side,
    selectedLongAsset,
    selectedShortAsset,
    setSelectedTheme,
    setSelectedPair,
    setTradeType,
    setOrderType,
    setAmount,
    setSide,
    setSelectedLongAsset,
    setSelectedShortAsset,
  } = useTradeStore();

  const [showChart, setShowChart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState<'long' | 'short' | null>(null);
  const [availableAssets, setAvailableAssets] = useState<Instrument[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true); // Start as loading
  const [singleAssets, setSingleAssets] = useState<Instrument[]>([]);
  const [showGraphs, setShowGraphs] = useState(false); // Graphs collapsed by default

  const handlePlaceTrade = async () => {
    if (!canPlaceTrade() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null); // Clear any previous errors

    try {
      // Build trade order
      let order;
      if (tradeType === 'pair' && selectedLongAsset && selectedShortAsset) {
        // Create a theme-like object for pair trade
        order = {
          type: 'pair',
          theme: {
            id: `${selectedLongAsset}-vs-${selectedShortAsset}`,
            name: `${selectedLongAsset} vs ${selectedShortAsset}`,
            description: `Long ${selectedLongAsset}, Short ${selectedShortAsset}`,
            icon: '⚖️',
            tokens: [selectedLongAsset, selectedShortAsset],
            change24h: 0,
            type: 'pair',
            longAsset: selectedLongAsset,
            shortAsset: selectedShortAsset,
          },
          pair: undefined,
          side: 'long', // Pairs are always long one, short the other
          orderType,
          amount: parseFloat(amount),
        };
      } else if (tradeType === 'basket' && selectedTheme) {
        order = {
          type: 'theme',
          theme: selectedTheme,
          pair: undefined,
          side,
          orderType,
          amount: parseFloat(amount),
        };
      } else {
        order = {
          type: tradeType === 'single' ? 'single' : 'pair',
          theme: tradeType === 'pair' ? selectedTheme : undefined,
          pair: tradeType === 'single' ? selectedPair : undefined,
          side,
          orderType,
          amount: parseFloat(amount),
        };
      }

      // Submit to Pear Execution API with wallet address
      const response = await TradeService.submitOrder(order as any, walletAddress || '');

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
    if (tradeType === 'pair' && selectedLongAsset && selectedShortAsset) {
      return `Trade ${selectedLongAsset} going up vs ${selectedShortAsset} going down`;
    }
    if (tradeType === 'basket' && selectedTheme) {
      return side === 'long'
        ? `Long ${selectedTheme.name} basket`
        : `Short ${selectedTheme.name} basket`;
    }
    if (tradeType === 'single' && selectedPair) {
      return side === 'long'
        ? `Long ${selectedPair.displayName}`
        : `Short ${selectedPair.displayName}`;
    }
    return 'Select what you want to trade';
  };

  const canPlaceTrade = () => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (tradeType === 'pair' && (!selectedLongAsset || !selectedShortAsset)) return false;
    if (tradeType === 'basket' && !selectedTheme) return false;
    if (tradeType === 'single' && !selectedPair) return false;
    return true;
  };

  const getSelectedSymbol = (asset?: string) => {
    if (asset) {
      return `${asset}USD`;
    }
    if (tradeType === 'pair' && selectedLongAsset) {
      return `${selectedLongAsset}USD`;
    }
    if (tradeType === 'single' && selectedPair) {
      return selectedPair.symbol;
    }
    return 'BTCUSD';
  };

  /**
   * Generate a trading signal/advice based on the selected assets
   * This is hardcoded for now but should make sense with the graph data
   */
  const getTradingSignal = (): { signal: 'bullish' | 'bearish' | 'neutral'; title: string; message: string; reasoning: string } => {
    if (tradeType === 'pair' && selectedLongAsset && selectedShortAsset) {
      // Pair trade signal
      return {
        signal: 'bullish',
        title: 'Pair Trade Opportunity',
        message: `Consider going long on ${selectedLongAsset} vs short on ${selectedShortAsset}`,
        reasoning: `${selectedLongAsset} shows stronger momentum relative to ${selectedShortAsset} based on recent price action. This pair trade allows you to profit from the relative performance difference while reducing overall market exposure.`,
      };
    }
    
    if (tradeType === 'basket' && selectedTheme) {
      // Basket trade signal
      const direction = side === 'long' ? 'upward' : 'downward';
      return {
        signal: side === 'long' ? 'bullish' : 'bearish',
        title: `${selectedTheme.name} Basket ${side === 'long' ? 'Long' : 'Short'}`,
        message: `The ${selectedTheme.name} basket shows ${direction} momentum`,
        reasoning: `The ${selectedTheme.name} basket (${selectedTheme.tokens.join(', ')}) is showing ${direction} trends. ${side === 'long' ? 'Going long' : 'Shorting'} this basket allows you to trade the entire theme rather than individual tokens, providing diversification within the theme.`,
      };
    }
    
    if (tradeType === 'single' && selectedPair) {
      // Single token signal
      const change = selectedPair.change24h || 0;
      const isPositive = change >= 0;
      return {
        signal: side === 'long' ? (isPositive ? 'bullish' : 'neutral') : (isPositive ? 'neutral' : 'bearish'),
        title: `${selectedPair.displayName} ${side === 'long' ? 'Long' : 'Short'}`,
        message: `${selectedPair.displayName} is ${isPositive ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}% in the last 24h`,
        reasoning: side === 'long' 
          ? `Going long on ${selectedPair.displayName} allows you to profit if the price continues to rise. ${isPositive ? 'Recent positive momentum suggests potential continuation.' : 'Consider waiting for a better entry point or use a limit order.'}`
          : `Shorting ${selectedPair.displayName} allows you to profit if the price falls. ${!isPositive ? 'Recent negative momentum suggests potential continuation.' : 'Be cautious as the asset is currently showing positive momentum.'}`,
      };
    }
    
    // Default neutral signal
    return {
      signal: 'neutral',
      title: 'Select Assets to Trade',
      message: 'Choose your trading pair, basket, or single token to see trading advice',
      reasoning: 'Once you select assets, we\'ll provide personalized trading signals based on current market conditions.',
    };
  };

  // Reset graph visibility when selections change
  useEffect(() => {
    setShowGraphs(false);
  }, [tradeType, selectedLongAsset, selectedShortAsset, selectedTheme, selectedPair, side]);

  // Fetch assets based on trade type
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      try {
        let assets: Instrument[] = [];
        
        if (tradeType === 'pair' || tradeType === 'basket') {
          // Fetch from Pear for pairs and baskets
          assets = await AssetService.getPearAssets();
          setAvailableAssets(assets);
          console.log(`✅ Loaded ${assets.length} Pear assets for ${tradeType}`);
        } else if (tradeType === 'single') {
          // Fetch from Hyperliquid for single
          assets = await AssetService.getHyperliquidAssets();
          setSingleAssets(assets);
          // Also update availableAssets for the selector
          setAvailableAssets(assets);
          console.log(`✅ Loaded ${assets.length} Hyperliquid assets for single trading`);
        }
        
        // Ensure we always have assets
        if (assets.length === 0) {
          console.warn('No assets loaded, using fallback');
          if (tradeType === 'pair' || tradeType === 'basket') {
            const fallback = await AssetService.getPearAssets();
            setAvailableAssets(fallback);
          } else {
            const fallback = await AssetService.getHyperliquidAssets();
            setAvailableAssets(fallback);
          }
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
        // Ensure we have fallback assets
        try {
          if (tradeType === 'pair' || tradeType === 'basket') {
            const fallback = await AssetService.getPearAssets();
            setAvailableAssets(fallback);
          } else {
            const fallback = await AssetService.getHyperliquidAssets();
            setAvailableAssets(fallback);
          }
        } catch (fallbackError) {
          console.error('Even fallback failed:', fallbackError);
        }
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, [tradeType]);

  /**
   * Convert API error messages to user-friendly messages
   */
  const getUserFriendlyError = (error: string | undefined): string => {
    if (!error) {
      return 'Failed to place trade. Please try again.';
    }

    // Handle authentication errors
    if (error.includes('401') || error.includes('Unauthorized') || error.includes('authentication')) {
      return 'Authentication required. Please try again.';
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
    <View style={styles.container}>
      {/* Orange Flowing Gradient Background */}
      <LinearGradient
        colors={[
          '#0A0500', // Deep near-black
          '#1A0F00', // Dark charcoal with orange hint
          '#2A1505', // Dark orange-brown
          '#1A0F00', // Back to charcoal
          '#0F0800', // Deep navy-orange blend
        ]}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Flowing orange gradient layer */}
      <LinearGradient
        colors={[
          'rgba(255, 107, 53, 0.15)', // Vibrant orange-red
          'rgba(255, 140, 60, 0.08)', // Bright orange
          'transparent',
          'rgba(255, 179, 71, 0.12)', // Yellow-orange
          'rgba(255, 107, 53, 0.10)', // Back to orange-red
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 0.7, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Additional flowing layer for depth */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 69, 0, 0.08)', // Red-orange
          'rgba(255, 140, 60, 0.06)', // Orange
          'transparent',
        ]}
        locations={[0, 0.4, 0.6, 1]}
        start={{ x: 0.7, y: 0.3 }}
        end={{ x: 0.3, y: 0.9 }}
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
              <Text style={styles.title}>New Trade</Text>
              <Text style={styles.subtitle}>
                {tradeType === 'pair' 
                  ? 'Long one asset, short another'
                  : tradeType === 'basket'
                  ? 'Trade groups of tokens'
                  : 'Trade individual tokens'}
              </Text>
            </View>
            {/* Wallet Connection Button */}
            {isConnected ? (
              <Pressable
                style={styles.walletButton}
                onPress={() => setShowWalletModal(true)}
                accessibilityRole="button"
                accessibilityLabel="View Wallet"
              >
                <Text style={styles.walletText}>
                  {formatAddress(walletAddress)}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.connectButton}
                onPress={() => setShowWalletModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Connect Wallet"
              >
                <Ionicons name="wallet-outline" size={18} color="#FFF" />
                <Text style={styles.connectText}>Connect</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Trade Type Selector */}
        <View style={styles.tradeTypeRow}>
          <Pressable
            onPress={() => {
              setTradeType('pair');
              setSelectedPair(null);
              setSelectedTheme(null);
              setSelectedLongAsset(null);
              setSelectedShortAsset(null);
            }}
            style={[styles.tradeTypeButton, tradeType === 'pair' && styles.tradeTypeButtonActive]}
          >
            <Ionicons
              name="swap-horizontal"
              size={18}
              color={tradeType === 'pair' ? '#FF6B35' : 'rgba(255, 255, 255, 0.6)'}
              style={styles.tradeTypeIcon}
            />
            <Text
              style={[
                styles.tradeTypeText,
                tradeType === 'pair' && styles.tradeTypeTextActive,
              ]}
            >
              Pairs
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setTradeType('basket');
              setSelectedPair(null);
              setSelectedLongAsset(null);
              setSelectedShortAsset(null);
            }}
            style={[styles.tradeTypeButton, tradeType === 'basket' && styles.tradeTypeButtonActive]}
          >
            <Ionicons
              name="layers"
              size={18}
              color={tradeType === 'basket' ? '#FF6B35' : 'rgba(255, 255, 255, 0.6)'}
              style={styles.tradeTypeIcon}
            />
            <Text
              style={[
                styles.tradeTypeText,
                tradeType === 'basket' && styles.tradeTypeTextActive,
              ]}
            >
              Baskets
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setTradeType('single');
              setSelectedTheme(null);
              setSelectedLongAsset(null);
              setSelectedShortAsset(null);
            }}
            style={[styles.tradeTypeButton, tradeType === 'single' && styles.tradeTypeButtonActive]}
          >
            <Ionicons
              name="diamond"
              size={18}
              color={tradeType === 'single' ? '#FF6B35' : 'rgba(255, 255, 255, 0.6)'}
              style={styles.tradeTypeIcon}
            />
            <Text
              style={[
                styles.tradeTypeText,
                tradeType === 'single' && styles.tradeTypeTextActive,
              ]}
            >
              Single
            </Text>
          </Pressable>
        </View>

        {/* Pair Selector - Choose Long and Short Assets */}
        {tradeType === 'pair' && (
          <>
            <GlowingBorder
              style={styles.selectorPanel}
              glowColor="rgba(255, 255, 255, 0.2)"
              disabled={false}
              glow={false}
              spread={8}
              proximity={0}
              inactiveZone={0.7}
              movementDuration={2000}
              borderWidth={0.15}
            >
              <View style={styles.selectorContent}>
                <Text style={styles.sectionLabel}>Choose Your Pair</Text>
                <Text style={styles.sectionHint}>
                  Select which token to go long and which to short
                </Text>

                {/* Long Asset Selector */}
                <View style={styles.assetSelectorRow}>
                  <View style={styles.assetSelectorLabel}>
                    <Text style={styles.assetSelectorTitle}>Long (Going Up)</Text>
                    <Text style={styles.assetSelectorSubtitle}>Token you think will rise</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      console.log('Opening long asset selector, available assets:', availableAssets.length);
                      setShowAssetSelector('long');
                    }}
                    style={[
                      styles.assetButton,
                      selectedLongAsset ? styles.assetButtonSelected : null,
                    ]}
                  >
                    <Text style={styles.assetButtonText}>
                      {selectedLongAsset || 'Select Asset'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="rgba(255, 255, 255, 0.7)" />
                  </Pressable>
                </View>

                {/* Short Asset Selector */}
                <View style={styles.assetSelectorRow}>
                  <View style={styles.assetSelectorLabel}>
                    <Text style={styles.assetSelectorTitle}>Short (Going Down)</Text>
                    <Text style={styles.assetSelectorSubtitle}>Token you think will fall</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      console.log('Opening short asset selector, available assets:', availableAssets.length);
                      setShowAssetSelector('short');
                    }}
                    style={[
                      styles.assetButton,
                      selectedShortAsset ? styles.assetButtonSelected : null,
                    ]}
                  >
                    <Text style={styles.assetButtonText}>
                      {selectedShortAsset || 'Select Asset'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="rgba(255, 255, 255, 0.7)" />
                  </Pressable>
                </View>
              </View>
            </GlowingBorder>

            {/* Trading Signal and Charts when both assets are selected */}
            {selectedLongAsset && selectedShortAsset && (() => {
              const signal = getTradingSignal();
              return (
                <>
                  {/* Trading Signal */}
                  <GlowingBorder
                    style={styles.signalContainer}
                    glowColor={
                      signal.signal === 'bullish' 
                        ? 'rgba(34, 197, 94, 0.3)' 
                        : signal.signal === 'bearish'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(255, 255, 255, 0.2)'
                    }
                    disabled={false}
                    glow={false}
                    spread={8}
                    proximity={0}
                    inactiveZone={0.7}
                    movementDuration={2000}
                    borderWidth={0.15}
                  >
                    <View style={styles.signalContent}>
                      <View style={styles.signalHeader}>
                        <View style={styles.signalIconContainer}>
                          <Ionicons
                            name={signal.signal === 'bullish' ? 'trending-up' : signal.signal === 'bearish' ? 'trending-down' : 'analytics-outline'}
                            size={24}
                            color={
                              signal.signal === 'bullish'
                                ? theme.colors.success
                                : signal.signal === 'bearish'
                                ? theme.colors.error
                                : 'rgba(255, 255, 255, 0.7)'
                            }
                          />
                        </View>
                        <View style={styles.signalTextContainer}>
                          <Text style={styles.signalTitle}>{signal.title}</Text>
                          <Text style={styles.signalMessage}>{signal.message}</Text>
                        </View>
                      </View>
                      <View style={styles.signalReasoning}>
                        <Text style={styles.signalReasoningText}>{signal.reasoning}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowGraphs(!showGraphs)}
                        style={styles.seeGraphsButton}
                      >
                        <Ionicons
                          name={showGraphs ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color="#FF6B35"
                        />
                        <Text style={styles.seeGraphsButtonText}>
                          {showGraphs ? 'Hide Graphs' : 'See Graphs'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </GlowingBorder>

                  {/* Charts - Only shown when showGraphs is true */}
                  {showGraphs && (
                    <GlowingBorder
                      style={styles.chartsContainer}
                      glowColor="rgba(255, 255, 255, 0.2)"
                      disabled={false}
                      glow={false}
                      spread={8}
                      proximity={0}
                      inactiveZone={0.7}
                      movementDuration={2000}
                      borderWidth={0.15}
                    >
                      <View style={styles.chartsContent}>
                        <Text style={styles.chartsTitle}>Compare Performance</Text>
                        <Text style={styles.chartsSubtitle}>
                          Review both assets before placing your trade
                        </Text>
                        <View style={styles.chartsRow}>
                          <View style={styles.chartWrapper}>
                            <View style={styles.chartHeader}>
                              <Text style={styles.chartLabel}>Long: {selectedLongAsset}</Text>
                              <Text style={styles.chartLabelSubtext}>Going Up</Text>
                            </View>
                            <View style={styles.chartContainer}>
                              <TradingViewChart symbol={getSelectedSymbol(selectedLongAsset)} interval="D" />
                            </View>
                          </View>
                          <View style={styles.chartWrapper}>
                            <View style={styles.chartHeader}>
                              <Text style={styles.chartLabel}>Short: {selectedShortAsset}</Text>
                              <Text style={styles.chartLabelSubtext}>Going Down</Text>
                            </View>
                            <View style={styles.chartContainer}>
                              <TradingViewChart symbol={getSelectedSymbol(selectedShortAsset)} interval="D" />
                            </View>
                          </View>
                        </View>
                      </View>
                    </GlowingBorder>
                  )}
                </>
              );
            })()}
          </>
        )}

        {/* Basket Selector */}
        {tradeType === 'basket' && (
          <GlowingBorder
            style={styles.selectorPanel}
            glowColor="rgba(255, 255, 255, 0.2)"
            disabled={false}
            glow={false}
            spread={8}
            proximity={0}
            inactiveZone={0.7}
            movementDuration={2000}
            borderWidth={0.15}
          >
            <View style={styles.selectorContent}>
              <Text style={styles.sectionLabel}>Choose a Basket</Text>
              <Text style={styles.sectionHint}>
                Trade groups of related tokens
              </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.themeList}
              contentContainerStyle={styles.themeListContent}
            >
              {basketThemes.map((basketTheme) => (
                <Pressable
                  key={basketTheme.id}
                  onPress={() => setSelectedTheme(basketTheme)}
                  style={[
                    styles.pairCard,
                    selectedTheme?.id === basketTheme.id && styles.pairCardActive,
                  ]}
                >
                  <Text style={styles.pairIcon}>{basketTheme.icon}</Text>
                  <Text
                    style={[
                      styles.pairName,
                      selectedTheme?.id === basketTheme.id && styles.pairNameActive,
                    ]}
                  >
                    {basketTheme.name}
                  </Text>
                  <Text style={styles.pairDescription}>{basketTheme.description}</Text>
                  <View style={styles.pairChange}>
                    <Text
                      style={[
                        styles.pairChangeText,
                        {
                          color:
                            basketTheme.change24h >= 0
                              ? theme.colors.bullish
                              : theme.colors.bearish,
                        },
                      ]}
                    >
                      {basketTheme.change24h >= 0 ? '+' : ''}
                      {basketTheme.change24h}%
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            </View>
          </GlowingBorder>
        )}

        {/* Single Token Selector */}
        {tradeType === 'single' && (
          <GlowingBorder
            style={styles.selectorPanel}
            glowColor="rgba(255, 255, 255, 0.2)"
            disabled={false}
            glow={false}
            spread={8}
            proximity={0}
            inactiveZone={0.7}
            movementDuration={2000}
            borderWidth={0.15}
          >
            <View style={styles.selectorContent}>
              <Text style={styles.sectionLabel}>Choose a Token</Text>
              <Text style={styles.sectionHint}>
                Trade a single token going up or down
              </Text>
            {isLoadingAssets ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading tokens...</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pairList}
              >
                {singleAssets.length > 0 ? (
                  singleAssets.map((asset) => (
                    <Pressable
                      key={asset.symbol}
                      onPress={() => setSelectedPair({
                        symbol: `${asset.symbol}USD`,
                        displayName: `${asset.symbol}/USD`,
                        currentPrice: asset.currentPrice || 0,
                        change24h: asset.change24h || 0,
                      })}
                      style={[
                        styles.pairChip,
                        selectedPair?.symbol === `${asset.symbol}USD` && styles.pairChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pairChipText,
                          selectedPair?.symbol === `${asset.symbol}USD` && styles.pairChipTextActive,
                        ]}
                      >
                        {asset.symbol}/USD
                      </Text>
                      {asset.change24h !== undefined && (
                        <Text
                          style={[
                            styles.pairChange,
                            {
                              color:
                                asset.change24h >= 0 ? theme.colors.bullish : theme.colors.bearish,
                            },
                          ]}
                        >
                          {asset.change24h >= 0 ? '+' : ''}
                          {asset.change24h}%
                        </Text>
                      )}
                    </Pressable>
                  ))
                ) : (
                  mockTradePairs.map((pair) => (
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
                  ))
                )}
              </ScrollView>
            )}
            </View>
          </GlowingBorder>
        )}

        {/* Trade Description - Simplified */}
        {((tradeType === 'pair' && selectedLongAsset && selectedShortAsset) ||
          (tradeType === 'basket' && selectedTheme) ||
          (tradeType === 'single' && selectedPair)) && (
          <View style={styles.descriptionPanel}>
            <Text style={styles.descriptionText}>{getTradeDescription()}</Text>
          </View>
        )}

        {/* Trading Signal and Chart for Single Token */}
        {tradeType === 'single' && selectedPair && (() => {
          const signal = getTradingSignal();
          return (
            <>
              {/* Trading Signal */}
              <GlowingBorder
                style={styles.signalContainer}
                glowColor={
                  signal.signal === 'bullish' 
                    ? 'rgba(34, 197, 94, 0.3)' 
                    : signal.signal === 'bearish'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(255, 255, 255, 0.2)'
                }
                disabled={false}
                glow={false}
                spread={8}
                proximity={0}
                inactiveZone={0.7}
                movementDuration={2000}
                borderWidth={0.15}
              >
                <View style={styles.signalContent}>
                  <View style={styles.signalHeader}>
                    <View style={styles.signalIconContainer}>
                      <Ionicons
                        name={signal.signal === 'bullish' ? 'trending-up' : signal.signal === 'bearish' ? 'trending-down' : 'analytics-outline'}
                        size={24}
                        color={
                          signal.signal === 'bullish'
                            ? theme.colors.success
                            : signal.signal === 'bearish'
                            ? theme.colors.error
                            : 'rgba(255, 255, 255, 0.7)'
                        }
                      />
                    </View>
                    <View style={styles.signalTextContainer}>
                      <Text style={styles.signalTitle}>{signal.title}</Text>
                      <Text style={styles.signalMessage}>{signal.message}</Text>
                    </View>
                  </View>
                  <View style={styles.signalReasoning}>
                    <Text style={styles.signalReasoningText}>{signal.reasoning}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowGraphs(!showGraphs)}
                    style={styles.seeGraphsButton}
                  >
                    <Ionicons
                      name={showGraphs ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#FF6B35"
                    />
                    <Text style={styles.seeGraphsButtonText}>
                      {showGraphs ? 'Hide Graph' : 'See Graph'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlowingBorder>

              {/* Chart - Only shown when showGraphs is true */}
              {showGraphs && (
                <GlowingBorder
                  style={styles.chartsContainer}
                  glowColor="rgba(255, 255, 255, 0.2)"
                  disabled={false}
                  glow={false}
                  spread={8}
                  proximity={0}
                  inactiveZone={0.7}
                  movementDuration={2000}
                  borderWidth={0.15}
                >
                  <View style={styles.chartsContent}>
                    <Text style={styles.chartsTitle}>Price Chart</Text>
                    <Text style={styles.chartsSubtitle}>
                      Review the asset before placing your trade
                    </Text>
                    <View style={styles.chartContainer}>
                      <TradingViewChart symbol={getSelectedSymbol()} interval="D" />
                    </View>
                  </View>
                </GlowingBorder>
              )}
            </>
          );
        })()}

        {/* Trading Signal and Chart for Basket */}
        {tradeType === 'basket' && selectedTheme && (() => {
          const signal = getTradingSignal();
          return (
            <>
              {/* Trading Signal */}
              <GlowingBorder
                style={styles.signalContainer}
                glowColor={
                  signal.signal === 'bullish' 
                    ? 'rgba(34, 197, 94, 0.3)' 
                    : signal.signal === 'bearish'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(255, 255, 255, 0.2)'
                }
                disabled={false}
                glow={false}
                spread={8}
                proximity={0}
                inactiveZone={0.7}
                movementDuration={2000}
                borderWidth={0.15}
              >
                <View style={styles.signalContent}>
                  <View style={styles.signalHeader}>
                    <View style={styles.signalIconContainer}>
                      <Ionicons
                        name={signal.signal === 'bullish' ? 'trending-up' : signal.signal === 'bearish' ? 'trending-down' : 'analytics-outline'}
                        size={24}
                        color={
                          signal.signal === 'bullish'
                            ? theme.colors.success
                            : signal.signal === 'bearish'
                            ? theme.colors.error
                            : 'rgba(255, 255, 255, 0.7)'
                        }
                      />
                    </View>
                    <View style={styles.signalTextContainer}>
                      <Text style={styles.signalTitle}>{signal.title}</Text>
                      <Text style={styles.signalMessage}>{signal.message}</Text>
                    </View>
                  </View>
                  <View style={styles.signalReasoning}>
                    <Text style={styles.signalReasoningText}>{signal.reasoning}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowGraphs(!showGraphs)}
                    style={styles.seeGraphsButton}
                  >
                    <Ionicons
                      name={showGraphs ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#FF6B35"
                    />
                    <Text style={styles.seeGraphsButtonText}>
                      {showGraphs ? 'Hide Graph' : 'See Graph'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlowingBorder>

              {/* Chart - Only shown when showGraphs is true */}
              {showGraphs && (
                <GlowingBorder
                  style={styles.chartsContainer}
                  glowColor="rgba(255, 255, 255, 0.2)"
                  disabled={false}
                  glow={false}
                  spread={8}
                  proximity={0}
                  inactiveZone={0.7}
                  movementDuration={2000}
                  borderWidth={0.15}
                >
                  <View style={styles.chartsContent}>
                    <Text style={styles.chartsTitle}>Basket Performance</Text>
                    <Text style={styles.chartsSubtitle}>
                      {selectedTheme.tokens.join(', ')}
                    </Text>
                    <View style={styles.chartContainer}>
                      <TradingViewChart symbol={getSelectedSymbol(selectedTheme.tokens[0])} interval="D" />
                    </View>
                  </View>
                </GlowingBorder>
              )}
            </>
          );
        })()}

        {/* Trade Ticket */}
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
            <Text style={styles.sectionLabel}>Your Trade</Text>

          {/* Long/Short Toggle - For Single and Basket */}
          {(tradeType === 'single' || tradeType === 'basket') && (
            <View style={styles.sideToggle}>
              <Pressable
                onPress={() => setSide('long')}
                style={[styles.sideButton, side === 'long' && styles.sideButtonLong]}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={side === 'long' ? '#FFF' : 'rgba(255, 255, 255, 0.7)'}
                />
                <Text
                  style={[styles.sideButtonText, side === 'long' && styles.sideButtonTextActive]}
                >
                  Go Long
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSide('short')}
                style={[styles.sideButton, side === 'short' && styles.sideButtonShort]}
              >
                <Ionicons
                  name="trending-down"
                  size={20}
                  color={side === 'short' ? '#FFF' : 'rgba(255, 255, 255, 0.7)'}
                />
                <Text
                  style={[styles.sideButtonText, side === 'short' && styles.sideButtonTextActive]}
                >
                  Go Short
                </Text>
              </Pressable>
            </View>
          )}

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
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="decimal-pad"
              />
            </View>
          </View>


          {/* Place Trade Button */}
          <Button
            variant={tradeType === 'pair' || side === 'long' ? 'success' : 'error'}
            onPress={handlePlaceTrade}
            fullWidth
            disabled={!canPlaceTrade() || isSubmitting}
            loading={isSubmitting}
            size="lg"
          >
            {isSubmitting
              ? 'Placing Order...'
              : tradeType === 'pair'
              ? `🚀 Place Pair Trade - $${amount || '0.00'}`
              : tradeType === 'basket'
              ? `${side === 'long' ? '🚀 Long Basket' : '📉 Short Basket'} - $${amount || '0.00'}`
              : `${side === 'long' ? '🚀 Go Long' : '📉 Go Short'} - $${amount || '0.00'}`}
          </Button>

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
            <Text style={styles.successText}>Trade Placed! 🎉</Text>
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
              <Text style={styles.infoTitle}>How Pair Trading Works</Text>
              <Text style={styles.infoText}>
                Pair trading lets you trade one token going up while another goes down. For example, "ETH vs BTC" means you're trading ETH to outperform BTC. If ETH goes up more than BTC (or BTC goes down), you profit!
              </Text>
              <Button onPress={() => setShowInfo(null)} variant="primary" fullWidth>
                Got it!
              </Button>
            </GlassPanel>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Asset Selector Modal */}
      <Modal 
        visible={showAssetSelector !== null} 
        transparent 
        animationType="slide"
        onRequestClose={() => setShowAssetSelector(null)}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowAssetSelector(null)}
          />
          <Animated.View 
            entering={FadeIn} 
            exiting={FadeOut} 
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <GlowingBorder
              style={styles.assetModal}
              glowColor="rgba(255, 255, 255, 0.2)"
              disabled={false}
              glow={false}
              spread={8}
              proximity={0}
              inactiveZone={0.7}
              movementDuration={2000}
              borderWidth={0.15}
            >
              <View style={styles.assetModalInner}>
                <View style={styles.assetModalHeader}>
                  <Text style={styles.assetModalTitle}>
                    Select {showAssetSelector === 'long' ? 'Long' : 'Short'} Asset
                  </Text>
                  <Pressable onPress={() => setShowAssetSelector(null)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
                {isLoadingAssets ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading assets...</Text>
                  </View>
                ) : (
                  <ScrollView 
                    style={styles.assetList} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.assetListContent}
                  >
                    {availableAssets.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No assets available</Text>
                        <Text style={styles.emptySubtext}>Check console for details</Text>
                      </View>
                    ) : (
                      availableAssets.map((asset) => (
                        <Pressable
                          key={asset.symbol}
                          onPress={() => {
                            console.log('Selected asset:', asset.symbol);
                            if (showAssetSelector === 'long') {
                              setSelectedLongAsset(asset.symbol);
                            } else {
                              setSelectedShortAsset(asset.symbol);
                            }
                            setShowAssetSelector(null);
                          }}
                          style={[
                            styles.assetItem,
                            ((showAssetSelector === 'long' && selectedLongAsset === asset.symbol) ||
                             (showAssetSelector === 'short' && selectedShortAsset === asset.symbol)) &&
                              styles.assetItemSelected,
                          ]}
                        >
                          <View style={styles.assetItemContent}>
                            <Text style={styles.assetItemSymbol}>{asset.symbol}</Text>
                            <Text style={styles.assetItemName}>{asset.name || asset.displayName || asset.symbol}</Text>
                          </View>
                          {asset.change24h !== undefined && (
                            <Text
                              style={[
                                styles.assetItemChange,
                                {
                                  color:
                                    asset.change24h >= 0
                                      ? theme.colors.bullish
                                      : theme.colors.bearish,
                                },
                              ]}
                            >
                              {asset.change24h >= 0 ? '+' : ''}
                              {asset.change24h}%
                            </Text>
                          )}
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                )}
              </View>
            </GlowingBorder>
          </Animated.View>
        </SafeAreaView>
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
                <Pressable onPress={() => {
                  setShowWalletModal(false);
                  setWalletError(null);
                  setWalletInputAddress('');
                }}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              {isConnected ? (
                // Connected State
                <View style={styles.walletModalContent}>
                  <View style={styles.walletConnectedBadge}>
                    <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                  </View>
                  <Text style={styles.walletConnectedLabel}>Connected Address</Text>
                  <View style={styles.walletAddressBox}>
                    <Text style={styles.walletAddressText}>{walletAddress}</Text>
                  </View>
                  <Text style={styles.walletHint}>
                    Your wallet is connected and ready to trade
                  </Text>
                  <Button
                    variant="error"
                    onPress={handleDisconnectWallet}
                    fullWidth
                    size="lg"
                  >
                    Disconnect
                  </Button>
                </View>
              ) : (
                // Disconnected State
                <View style={styles.walletModalContent}>
                  <View style={styles.walletIconContainer}>
                    <Ionicons name="wallet-outline" size={64} color="#FF6B35" />
                  </View>
                  <Text style={styles.walletDescription}>
                    Enter your Ethereum wallet address to start trading
                  </Text>
                  <View style={styles.walletInputGroup}>
                    <Text style={styles.walletInputLabel}>Wallet Address</Text>
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
                      editable={!isConnecting}
                    />
                    <Text style={styles.walletInputHint}>
                      Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
                    </Text>
                  </View>
                  {walletError && (
                    <View style={styles.walletErrorBox}>
                      <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                      <Text style={styles.walletErrorText}>{walletError}</Text>
                    </View>
                  )}
                  {isConnecting && (
                    <View style={styles.walletLoadingBox}>
                      <Text style={styles.walletLoadingText}>🔐 Authenticating with Pear Protocol...</Text>
                      <Text style={styles.walletLoadingSubtext}>Please wait while we verify your wallet</Text>
                    </View>
                  )}
                  <Button
                    variant="primary"
                    onPress={handleConnectWallet}
                    fullWidth
                    size="lg"
                    disabled={!walletInputAddress || isConnecting}
                    loading={isConnecting}
                  >
                    {isConnecting ? 'Authenticating...' : 'Connect Wallet'}
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
    backgroundColor: '#000000',
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
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#FFFFFF',
  },
  title: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: theme.typography.weights.regular,
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
  assetSelectorRow: {
    marginBottom: theme.spacing.md,
  },
  assetSelectorLabel: {
    marginBottom: theme.spacing.xs,
  },
  assetSelectorTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs / 2,
  },
  assetSelectorSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  assetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  assetButtonSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  assetButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: '#FFFFFF',
  },
  chartsContainer: {
    padding: 2,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  chartsContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
  },
  chartsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  chartsSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: theme.spacing.md,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  chartWrapper: {
    flex: 1,
  },
  chartHeader: {
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
  },
  chartLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs / 2,
  },
  chartLabelSubtext: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  chartContainer: {
    height: 300,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  assetModal: {
    padding: 2,
    borderRadius: theme.borderRadius.lg,
    maxHeight: '80%',
  },
  assetModalInner: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
    backgroundColor: 'rgba(8, 8, 12, 0.95)',
  },
  assetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  assetModalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  assetList: {
    maxHeight: 500,
  },
  assetListContent: {
    paddingBottom: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: theme.spacing.xs,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  assetItemSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  assetItemContent: {
    flex: 1,
  },
  assetItemSymbol: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs / 2,
  },
  assetItemName: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  assetItemChange: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  tradeTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tradeTypeButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
    borderWidth: 1.5,
  },
  tradeTypeIcon: {
    marginRight: theme.spacing.xs / 2,
  },
  tradeTypeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tradeTypeTextActive: {
    color: '#FF6B35',
    fontWeight: theme.typography.weights.semibold,
  },
  selectorPanel: {
    padding: 2,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  selectorContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  sectionHint: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: theme.spacing.md,
  },
  infoButton: {
    padding: theme.spacing.xs,
  },
  themeList: {
    flexDirection: 'row',
  },
  themeListContent: {
    paddingRight: theme.spacing.md,
  },
  pairCard: {
    width: 160,
    padding: theme.spacing.lg,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairCardActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  pairIcon: {
    fontSize: 36,
    marginBottom: theme.spacing.sm,
  },
  pairName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  pairNameActive: {
    color: '#FF6B35',
  },
  pairDescription: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.sizes.sm * 1.4,
  },
  pairChange: {
    marginTop: 'auto',
  },
  pairChangeText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  pairList: {
    flexDirection: 'row',
  },
  pairChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pairChipActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  pairChipText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: theme.spacing.xs,
  },
  pairChipTextActive: {
    color: '#FF6B35',
  },
  pairChipChange: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  descriptionPanel: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  descriptionText: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: theme.typography.weights.medium,
  },
  tradeTicket: {
    padding: 2,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  tradeTicketContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickAmountButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  quickAmountText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  quickAmountTextActive: {
    color: '#FF6B35',
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputPrefix: {
    paddingLeft: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium,
    color: '#FFFFFF',
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium,
    color: '#FFFFFF',
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  radioActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  orderTypeText: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
  },
  orderTypeHint: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.4)',
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
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    zIndex: 2,
  },
  successModal: {
    alignItems: 'center',
    minWidth: 280,
    padding: theme.spacing.xl,
  },
  successText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginTop: theme.spacing.lg,
  },
  successSubtext: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: '#FFFFFF',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: '#FFFFFF',
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.md,
    marginBottom: theme.spacing.lg,
  },
  signalContainer: {
    padding: 2,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  signalContent: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg - 2,
  },
  signalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  signalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  signalTextContainer: {
    flex: 1,
  },
  signalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  signalMessage: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: theme.typography.weights.medium,
  },
  signalReasoning: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.borderRadius.md,
  },
  signalReasoningText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.sm,
  },
  seeGraphsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    gap: theme.spacing.xs,
  },
  seeGraphsButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FF6B35',
  },
});
