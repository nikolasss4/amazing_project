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
import { useTradeStore, HedgeAsset } from '@app/store';
import { TradingViewChart } from '../components/TradingViewChart';
import { TradeService } from '../services/TradeService';
import { AssetService, Instrument } from '../services/AssetService';

const QUICK_AMOUNTS = [10, 50, 100, 500];

export const TradeScreen: React.FC = () => {
  const {
    tradeMode,
    orderType,
    amount,
    selectedLongAsset,
    selectedShortAsset,
    hedgeLongAssets,
    hedgeShortAssets,
    setTradeMode,
    setOrderType,
    setAmount,
    setSelectedLongAsset,
    setSelectedShortAsset,
    addHedgeLongAsset,
    removeHedgeLongAsset,
    updateHedgeLongAssetWeight,
    addHedgeShortAsset,
    removeHedgeShortAsset,
    updateHedgeShortAssetWeight,
    clearHedgeAssets,
  } = useTradeStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState<'long' | 'short' | 'hedge-long' | 'hedge-short' | null>(null);
  const [availableAssets, setAvailableAssets] = useState<Instrument[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [showGraphs, setShowGraphs] = useState(false);

  // Wallet state
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletInputAddress, setWalletInputAddress] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Helper function to format wallet address
  const formatAddress = (address: string | null): string => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle wallet connection
  const handleConnectWallet = async () => {
    if (!walletInputAddress) {
      setWalletError('Please enter a wallet address');
      return;
    }

    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletInputAddress)) {
      setWalletError('Invalid Ethereum address format');
      return;
    }

    setIsConnecting(true);
    setWalletError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setWalletAddress(walletInputAddress);
      setIsConnected(true);
      setShowWalletModal(false);
      setWalletInputAddress('');
    } catch (error) {
      setWalletError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress('');
    setShowWalletModal(false);
  };

  const handlePlaceTrade = async () => {
    if (!canPlaceTrade() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let order;
      
      if (tradeMode === 'simple' && selectedLongAsset && selectedShortAsset) {
        // Simple trade - 2 tokens
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
          side: 'long',
          orderType,
          amount: parseFloat(amount),
        };
      } else if (tradeMode === 'hedge' && hedgeLongAssets.length > 0 && hedgeShortAssets.length > 0) {
        // Hedge trade - multiple assets with weights
        order = {
          type: 'hedge',
          hedgeLongAssets: hedgeLongAssets,
          hedgeShortAssets: hedgeShortAssets,
          orderType,
          amount: parseFloat(amount),
        };
      } else {
        setError('Please select assets for your trade');
        setIsSubmitting(false);
        return;
      }

      const response = await TradeService.submitOrder(order as any, walletAddress || '');

      if (response.success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAmount('');
        }, 2000);
      } else {
        const errorMessage = getUserFriendlyError(response.error);
        setError(errorMessage);
      }
    } catch (error) {
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error instanceof Error) {
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
    if (tradeMode === 'simple' && selectedLongAsset && selectedShortAsset) {
      return `Long ${selectedLongAsset} vs Short ${selectedShortAsset}`;
    }
    if (tradeMode === 'hedge' && hedgeLongAssets.length > 0 && hedgeShortAssets.length > 0) {
      const longSymbols = hedgeLongAssets.map(a => `${a.symbol}(${a.weight}%)`).join(', ');
      const shortSymbols = hedgeShortAssets.map(a => `${a.symbol}(${a.weight}%)`).join(', ');
      return `Long: ${longSymbols} | Short: ${shortSymbols}`;
    }
    return 'Select assets to trade';
  };

  const canPlaceTrade = () => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (tradeMode === 'simple' && (!selectedLongAsset || !selectedShortAsset)) return false;
    if (tradeMode === 'hedge' && (hedgeLongAssets.length === 0 || hedgeShortAssets.length === 0)) return false;
    return true;
  };

  const getSelectedSymbol = (asset?: string) => {
    if (asset) {
      return `${asset}USD`;
    }
    if (tradeMode === 'simple' && selectedLongAsset) {
      return `${selectedLongAsset}USD`;
    }
    return 'BTCUSD';
  };

  // Calculate total weight for hedge assets
  const getTotalWeight = (assets: HedgeAsset[]) => {
    return assets.reduce((sum, a) => sum + a.weight, 0);
  };

  // Auto-balance weights to equal 100%
  const autoBalanceWeights = (side: 'long' | 'short') => {
    const assets = side === 'long' ? hedgeLongAssets : hedgeShortAssets;
    if (assets.length === 0) return;
    
    const equalWeight = Math.floor(100 / assets.length);
    const remainder = 100 - (equalWeight * assets.length);
    
    assets.forEach((asset, index) => {
      const weight = index === 0 ? equalWeight + remainder : equalWeight;
      if (side === 'long') {
        updateHedgeLongAssetWeight(asset.symbol, weight);
      } else {
        updateHedgeShortAssetWeight(asset.symbol, weight);
      }
    });
  };

  // Reset graph visibility when selections change
  useEffect(() => {
    setShowGraphs(false);
  }, [tradeMode, selectedLongAsset, selectedShortAsset, hedgeLongAssets, hedgeShortAssets]);

  // Clear hedge assets when switching modes
  useEffect(() => {
    if (tradeMode === 'simple') {
      clearHedgeAssets();
    } else {
      setSelectedLongAsset(null);
      setSelectedShortAsset(null);
    }
  }, [tradeMode]);

  // Fetch assets
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const assets = await AssetService.getPearAssets();
        setAvailableAssets(assets);
        console.log(`✅ Loaded ${assets.length} Pear assets`);
        
        if (assets.length === 0) {
          console.warn('No assets loaded, using fallback');
          const fallback = await AssetService.getPearAssets();
          setAvailableAssets(fallback);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
        try {
          const fallback = await AssetService.getPearAssets();
          setAvailableAssets(fallback);
        } catch (fallbackError) {
          console.error('Even fallback failed:', fallbackError);
        }
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, []);

  const getUserFriendlyError = (error: string | undefined): string => {
    if (!error) {
      return 'Failed to place trade. Please try again.';
    }

    if (error.includes('401') || error.includes('Unauthorized') || error.includes('authentication')) {
      return 'Authentication required. Please try again.';
    }

    if (error.includes('400') || error.includes('Bad Request') || error.includes('invalid')) {
      return 'Invalid trade parameters. Please check your order details and try again.';
    }

    if (error.includes('500') || error.includes('Internal Server Error')) {
      return 'Server error. Please try again in a few moments.';
    }

    if (error.includes('balance') || error.includes('insufficient')) {
      return 'Insufficient balance. Please check your account balance.';
    }

    if (error.includes('amount') || error.includes('minimum')) {
      return 'Trade amount is too small. Minimum amount is required.';
    }

    return error;
  };

  // Render hedge asset item with weight slider
  const renderHedgeAssetItem = (asset: HedgeAsset, side: 'long' | 'short') => {
    const updateWeight = side === 'long' ? updateHedgeLongAssetWeight : updateHedgeShortAssetWeight;
    const removeAsset = side === 'long' ? removeHedgeLongAsset : removeHedgeShortAsset;
    
    return (
      <View key={asset.symbol} style={styles.hedgeAssetItem}>
        <View style={styles.hedgeAssetHeader}>
          <Text style={styles.hedgeAssetSymbol}>{asset.symbol}</Text>
          <Pressable onPress={() => removeAsset(asset.symbol)} style={styles.removeAssetButton}>
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>
        <View style={styles.weightRow}>
          <Text style={styles.weightLabel}>Weight:</Text>
          <View style={styles.weightInputContainer}>
            <Pressable 
              onPress={() => updateWeight(asset.symbol, asset.weight - 5)}
              style={styles.weightButton}
            >
              <Text style={styles.weightButtonText}>-</Text>
            </Pressable>
            <Text style={styles.weightValue}>{asset.weight}%</Text>
            <Pressable 
              onPress={() => updateWeight(asset.symbol, asset.weight + 5)}
              style={styles.weightButton}
            >
              <Text style={styles.weightButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Orange Flowing Gradient Background */}
      <LinearGradient
        colors={[
          '#0A0500',
          '#1A0F00',
          '#2A1505',
          '#1A0F00',
          '#0F0800',
        ]}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <LinearGradient
        colors={[
          'rgba(255, 107, 53, 0.15)',
          'rgba(255, 140, 60, 0.08)',
          'transparent',
          'rgba(255, 179, 71, 0.12)',
          'rgba(255, 107, 53, 0.10)',
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 0.7, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 69, 0, 0.08)',
          'rgba(255, 140, 60, 0.06)',
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
                  {tradeMode === 'simple' 
                    ? 'Long one asset, short another'
                    : 'Build a hedged portfolio'}
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

          {/* Trade Mode Selector - Simple vs Hedge */}
          <View style={styles.tradeModeRow}>
            <Pressable
              onPress={() => setTradeMode('simple')}
              style={[styles.tradeModeButton, tradeMode === 'simple' && styles.tradeModeButtonActive]}
            >
              <Ionicons
                name="swap-horizontal"
                size={18}
                color={tradeMode === 'simple' ? '#FF6B35' : 'rgba(255, 255, 255, 0.6)'}
                style={styles.tradeModeIcon}
              />
              <Text
                style={[
                  styles.tradeModeText,
                  tradeMode === 'simple' && styles.tradeModeTextActive,
                ]}
              >
                Simple Trade
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTradeMode('hedge')}
              style={[styles.tradeModeButton, tradeMode === 'hedge' && styles.tradeModeButtonActive]}
            >
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={tradeMode === 'hedge' ? '#FF6B35' : 'rgba(255, 255, 255, 0.6)'}
                style={styles.tradeModeIcon}
              />
              <Text
                style={[
                  styles.tradeModeText,
                  tradeMode === 'hedge' && styles.tradeModeTextActive,
                ]}
              >
                Hedge
              </Text>
            </Pressable>
          </View>

          {/* Choose Your Trade Panel */}
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
              <Text style={styles.sectionLabel}>Choose Your Trade</Text>
              <Text style={styles.sectionHint}>
                {tradeMode === 'simple' 
                  ? 'Select 2 tokens: one to go long, one to short'
                  : 'Select up to 4 assets for each side with custom weights'}
              </Text>

              {/* Simple Trade Mode */}
              {tradeMode === 'simple' && (
                <>
                  {/* Long Asset Selector */}
                  <View style={styles.assetSelectorRow}>
                    <View style={styles.assetSelectorLabel}>
                      <Text style={styles.assetSelectorTitle}>Long (Going Up)</Text>
                      <Text style={styles.assetSelectorSubtitle}>Token you think will rise</Text>
                    </View>
                    <Pressable
                      onPress={() => setShowAssetSelector('long')}
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
                      onPress={() => setShowAssetSelector('short')}
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
                </>
              )}

              {/* Hedge Trade Mode */}
              {tradeMode === 'hedge' && (
                <>
                  {/* Long Assets Section */}
                  <View style={styles.hedgeSection}>
                    <View style={styles.hedgeSectionHeader}>
                      <View>
                        <Text style={styles.hedgeSectionTitle}>Long Positions</Text>
                        <Text style={styles.hedgeSectionSubtitle}>
                          {hedgeLongAssets.length}/4 assets • Total: {getTotalWeight(hedgeLongAssets)}%
                        </Text>
                      </View>
                      <View style={styles.hedgeActions}>
                        {hedgeLongAssets.length > 0 && (
                          <Pressable 
                            onPress={() => autoBalanceWeights('long')}
                            style={styles.balanceButton}
                          >
                            <Text style={styles.balanceButtonText}>Balance</Text>
                          </Pressable>
                        )}
                        {hedgeLongAssets.length < 4 && (
                          <Pressable
                            onPress={() => setShowAssetSelector('hedge-long')}
                            style={styles.addAssetButton}
                          >
                            <Ionicons name="add" size={20} color="#FF6B35" />
                            <Text style={styles.addAssetButtonText}>Add</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                    {hedgeLongAssets.length === 0 ? (
                      <Pressable
                        onPress={() => setShowAssetSelector('hedge-long')}
                        style={styles.emptyHedgeSlot}
                      >
                        <Ionicons name="add-circle-outline" size={32} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyHedgeText}>Add long assets</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.hedgeAssetsList}>
                        {hedgeLongAssets.map(asset => renderHedgeAssetItem(asset, 'long'))}
                      </View>
                    )}
                  </View>

                  {/* Short Assets Section */}
                  <View style={styles.hedgeSection}>
                    <View style={styles.hedgeSectionHeader}>
                      <View>
                        <Text style={styles.hedgeSectionTitle}>Short Positions</Text>
                        <Text style={styles.hedgeSectionSubtitle}>
                          {hedgeShortAssets.length}/4 assets • Total: {getTotalWeight(hedgeShortAssets)}%
                        </Text>
                      </View>
                      <View style={styles.hedgeActions}>
                        {hedgeShortAssets.length > 0 && (
                          <Pressable 
                            onPress={() => autoBalanceWeights('short')}
                            style={styles.balanceButton}
                          >
                            <Text style={styles.balanceButtonText}>Balance</Text>
                          </Pressable>
                        )}
                        {hedgeShortAssets.length < 4 && (
                          <Pressable
                            onPress={() => setShowAssetSelector('hedge-short')}
                            style={styles.addAssetButton}
                          >
                            <Ionicons name="add" size={20} color="#FF6B35" />
                            <Text style={styles.addAssetButtonText}>Add</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                    {hedgeShortAssets.length === 0 ? (
                      <Pressable
                        onPress={() => setShowAssetSelector('hedge-short')}
                        style={styles.emptyHedgeSlot}
                      >
                        <Ionicons name="add-circle-outline" size={32} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyHedgeText}>Add short assets</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.hedgeAssetsList}>
                        {hedgeShortAssets.map(asset => renderHedgeAssetItem(asset, 'short'))}
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </GlowingBorder>

          {/* Trade Description */}
          {((tradeMode === 'simple' && selectedLongAsset && selectedShortAsset) ||
            (tradeMode === 'hedge' && hedgeLongAssets.length > 0 && hedgeShortAssets.length > 0)) && (
            <View style={styles.descriptionPanel}>
              <Text style={styles.descriptionText}>{getTradeDescription()}</Text>
            </View>
          )}

          {/* Charts for Simple Trade */}
          {tradeMode === 'simple' && selectedLongAsset && selectedShortAsset && (
            <>
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
                  {showGraphs ? 'Hide Charts' : 'View Charts'}
                </Text>
              </TouchableOpacity>

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
                    <View style={styles.chartsRow}>
                      <View style={styles.chartWrapper}>
                        <View style={styles.chartHeader}>
                          <Text style={styles.chartLabel}>Long: {selectedLongAsset}</Text>
                        </View>
                        <View style={styles.chartContainer}>
                          <TradingViewChart symbol={getSelectedSymbol(selectedLongAsset)} interval="D" />
                        </View>
                      </View>
                      <View style={styles.chartWrapper}>
                        <View style={styles.chartHeader}>
                          <Text style={styles.chartLabel}>Short: {selectedShortAsset}</Text>
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
          )}

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
                variant="success"
                onPress={handlePlaceTrade}
                fullWidth
                disabled={!canPlaceTrade() || isSubmitting}
                loading={isSubmitting}
                size="lg"
              >
                {isSubmitting
                  ? 'Placing Order...'
                  : tradeMode === 'simple'
                  ? `Place Trade - $${amount || '0.00'}`
                  : `Place Hedge Trade - $${amount || '0.00'}`}
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
            <Text style={styles.successText}>Trade Placed!</Text>
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
                    Select {showAssetSelector?.includes('long') ? 'Long' : 'Short'} Asset
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
                      </View>
                    ) : (
                      availableAssets
                        .filter(asset => {
                          // Filter out already selected assets for hedge mode
                          if (showAssetSelector === 'hedge-long') {
                            return !hedgeLongAssets.find(a => a.symbol === asset.symbol);
                          }
                          if (showAssetSelector === 'hedge-short') {
                            return !hedgeShortAssets.find(a => a.symbol === asset.symbol);
                          }
                          return true;
                        })
                        .map((asset) => (
                          <Pressable
                            key={asset.symbol}
                            onPress={() => {
                              if (showAssetSelector === 'long') {
                                setSelectedLongAsset(asset.symbol);
                              } else if (showAssetSelector === 'short') {
                                setSelectedShortAsset(asset.symbol);
                              } else if (showAssetSelector === 'hedge-long') {
                                addHedgeLongAsset({ symbol: asset.symbol, weight: 25 });
                              } else if (showAssetSelector === 'hedge-short') {
                                addHedgeShortAsset({ symbol: asset.symbol, weight: 25 });
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
                              <Text style={styles.assetItemName}>{asset.name || asset.symbol}</Text>
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
                      <Text style={styles.walletLoadingText}>Authenticating with Pear Protocol...</Text>
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
  tradeModeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  tradeModeButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tradeModeButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
    borderWidth: 1.5,
  },
  tradeModeIcon: {
    marginRight: theme.spacing.xs / 2,
  },
  tradeModeText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tradeModeTextActive: {
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
  // Hedge mode styles
  hedgeSection: {
    marginBottom: theme.spacing.lg,
  },
  hedgeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  hedgeSectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  hedgeSectionSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  hedgeActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  balanceButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceButtonText: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  addAssetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },
  addAssetButtonText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: '#FF6B35',
  },
  emptyHedgeSlot: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHedgeText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: theme.spacing.sm,
  },
  hedgeAssetsList: {
    gap: theme.spacing.sm,
  },
  hedgeAssetItem: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hedgeAssetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  hedgeAssetSymbol: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  removeAssetButton: {
    padding: 4,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightLabel: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  weightButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  weightValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FF6B35',
    minWidth: 50,
    textAlign: 'center',
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
    fontSize: theme.typography.sizes.sm,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: theme.typography.weights.medium,
  },
  seeGraphsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
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
  },
  chartContainer: {
    height: 300,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
  // Wallet Modal Styles
  walletModal: {
    minWidth: 340,
    maxWidth: '90%',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  walletModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  walletModalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  walletModalContent: {
    alignItems: 'center',
  },
  walletIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  walletDescription: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.sizes.md * 1.5,
  },
  walletInputGroup: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  walletInputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: theme.spacing.sm,
  },
  walletInput: {
    width: '100%',
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  walletInputHint: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: theme.spacing.sm,
  },
  walletErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: '100%',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  walletErrorText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
  },
  walletLoadingBox: {
    width: '100%',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  walletLoadingText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: '#FF6B35',
    marginBottom: theme.spacing.xs,
  },
  walletLoadingSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  walletConnectedBadge: {
    marginBottom: theme.spacing.lg,
  },
  walletConnectedLabel: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: theme.spacing.sm,
  },
  walletAddressBox: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  walletAddressText: {
    fontSize: theme.typography.sizes.sm,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  walletHint: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
});
