import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Platform, Modal, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlowingBorder } from '@ui/primitives/GlowingBorder';
import { theme } from '@app/theme';
import * as Haptics from 'expo-haptics';
import { useLearnStore, useUserStore } from '@app/store';
import { LeaderboardEntry } from '../models';
import { QRCodeModal } from '../components/QRCodeModal';
import { QRScannerModal } from '../components/QRScannerModal';
import { CommunityService, MarketMessage } from '../services/CommunityService';
import { CommunityNarrative, useNarratives } from '../hooks/useCommunityData';

type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all-time';
type CommunitySection = 'leaderboard' | 'global';

export const CommunityScreen: React.FC = () => {
  const ToastAndroid = Platform.OS === 'android' ? require('react-native').ToastAndroid : null;
  const { streak, totalXP } = useLearnStore();
  const { userId, username, setUser } = useUserStore();

  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('today');
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeSection, setActiveSection] = useState<CommunitySection>('leaderboard');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [localNarratives, setLocalNarratives] = useState<CommunityNarrative[]>([]);
  const [fadedNarratives, setFadedNarratives] = useState<Set<string>>(new Set());
  const [lastNarrativesUpdatedAt, setLastNarrativesUpdatedAt] = useState<Date | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'crypto' | 'room' | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [roomMessages, setRoomMessages] = useState<MarketMessage[]>([]);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState('');
  const [roomMessageType, setRoomMessageType] = useState<'bull' | 'bear' | 'question' | 'insight' | 'source'>('insight');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const flipRotation = useSharedValue(0);

  const {
    data: narrativesData,
    loading: narrativesLoading,
    error: narrativesError,
    refetch: refetchNarratives,
  } = useNarratives(undefined, 10, 60000); // Always fetch, use default userId in hook

  // Removed userId check - narratives are always fetched with default userId

  useEffect(() => {
    if (!userId) return;

    const fetchLeaderboards = async () => {
      try {
        setLeaderboardLoading(true);
        setLeaderboardError(null);
        const [global, friendsOnly] = await Promise.all([
          CommunityService.getLeaderboard(userId, 'global', leaderboardPeriod),
          CommunityService.getLeaderboard(userId, 'friends', leaderboardPeriod),
        ]);
        setGlobalLeaderboard(global.entries);
        setFriendsLeaderboard(friendsOnly.entries);
      } catch (error: any) {
        setLeaderboardError(error.message || 'Failed to load leaderboards');
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboards();
  }, [userId, leaderboardPeriod]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:89',message:'narrativesData updated',data:{narrativesCount:narrativesData.length,loading:narrativesLoading,firstNarrativeTitle:narrativesData[0]?.title,firstReason:narrativesData[0]?.insights?.reason?.substring(0,60),hasGenericText:(narrativesData[0]?.insights?.reason||'').includes('Narrative formed from recent')},timestamp:Date.now(),sessionId:'debug-session',runId:'check-data-flow',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Always set narratives data - no userId check needed
    setLocalNarratives(narrativesData);
    if (!narrativesLoading) {
      const latestUpdated = narrativesData.reduce<Date | null>((latest, narrative) => {
        const updatedAt = new Date(narrative.updated_at);
        if (!latest || updatedAt > latest) {
          return updatedAt;
        }
        return latest;
      }, null);
      setLastNarrativesUpdatedAt(latestUpdated ?? new Date());
    }
  }, [narrativesData, narrativesLoading]);

  const fadedStorageKey = userId ? `community_faded_narratives_${userId}` : null;

  useEffect(() => {
    if (!fadedStorageKey) return;
    let isMounted = true;
    const loadFaded = async () => {
      try {
        const stored = await AsyncStorage.getItem(fadedStorageKey);
        if (!stored || !isMounted) return;
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setFadedNarratives(new Set(parsed));
        }
      } catch (error) {
        console.warn('Failed to load faded narratives', error);
      }
    };
    loadFaded();
    return () => {
      isMounted = false;
    };
  }, [fadedStorageKey]);

  useEffect(() => {
    if (!fadedStorageKey) return;
    const storeFaded = async () => {
      try {
        await AsyncStorage.setItem(fadedStorageKey, JSON.stringify(Array.from(fadedNarratives)));
      } catch (error) {
        console.warn('Failed to persist faded narratives', error);
      }
    };
    storeFaded();
  }, [fadedNarratives, fadedStorageKey]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handlePeriodSelect = (period: LeaderboardPeriod) => {
    setLeaderboardPeriod(period);
  };

  const handleFlip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const newIsFlipped = !isFlipped;
    setIsFlipped(newIsFlipped);
    flipRotation.value = withTiming(newIsFlipped ? 180 : 0, { duration: 600 });
  };

  const handleQRPress = () => {
    // Haptics only work on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // On web, Alert.alert with buttons doesn't work well, so use simple alerts
    if (Platform.OS === 'web') {
      const choice = window.confirm('Click OK to show your QR code, or Cancel to scan a QR code');
      if (choice) {
        setShowQRModal(true);
      } else {
        setShowQRScanner(true);
      }
    } else {
      Alert.alert(
        'Add Friends',
        'Choose an option:',
        [
          {
            text: 'Show My QR Code',
            onPress: () => setShowQRModal(true),
          },
          {
            text: 'Scan QR Code',
            onPress: () => setShowQRScanner(true),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleFriendAdded = async (friendId: string, username: string) => {
    setShowQRScanner(false);
    Alert.alert('Success', `Added ${username} as a friend!`);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    };
  });

  const flipButtonIconStyle = useAnimatedStyle(() => {
    const rotate = interpolate(flipRotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  const formatTimestamp = (timestamp: Date | null) => {
    return timestamp ? timestamp.toLocaleString() : '—';
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android' && ToastAndroid) {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const NON_CRYPTO_TICKERS = new Set(['BRK', 'BRKA', 'BRKB', 'BRK.A', 'BRK.B', 'MSFT', 'TSLA']);

  const isCryptoAsset = (asset: string) => {
    const normalized = asset.replace('$', '').trim().toUpperCase();
    if (!normalized) return false;
    return !NON_CRYPTO_TICKERS.has(normalized);
  };

  const getVelocitySnapshot = (narrative: CommunityNarrative) => {
    const { current, previous } = narrative.insights.change;
    const delta = current - previous;
    const percent =
      previous === 0 ? (current > 0 ? 100 : 0) : Math.round((delta / previous) * 100);
    return {
      direction: percent >= 0 ? '↑' : '↓',
      percent: Math.abs(percent),
    };
  };

  const getConfidenceLabel = (level: CommunityNarrative['insights']['confidence']['level']) => {
    return `${level[0].toUpperCase()}${level.slice(1)}`;
  };

  const getWhyLine = (text: string) => {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= 120) return trimmed;
    return `${trimmed.slice(0, 117)}...`;
  };

  const updateNarrative = (narrativeId: string, updater: (narrative: CommunityNarrative) => CommunityNarrative) => {
    setLocalNarratives((prev) => prev.map((item) => (item.id === narrativeId ? updater(item) : item)));
  };

  const handleFollowNarrative = async (narrativeId: string) => {
    if (!userId) return;
    const snapshot = localNarratives.find((item) => item.id === narrativeId);
    updateNarrative(narrativeId, (item) => ({ ...item, is_followed: true }));
    try {
      await CommunityService.followNarrative(userId, narrativeId);
      await refetchNarratives();
    } catch (error: any) {
      if (snapshot) {
        updateNarrative(narrativeId, () => snapshot);
      }
      showToast(error.message || 'Failed to follow narrative');
    }
  };

  const handleFadeNarrative = async (narrativeId: string) => {
    if (!userId) return;
    const snapshot = localNarratives.find((item) => item.id === narrativeId);
    setFadedNarratives((prev) => new Set([...prev, narrativeId]));
    updateNarrative(narrativeId, (item) => ({ ...item, is_followed: false }));
    try {
      await CommunityService.fadeNarrative(userId, narrativeId);
      await refetchNarratives();
    } catch (error: any) {
      if (snapshot) {
        updateNarrative(narrativeId, () => snapshot);
      }
      setFadedNarratives((prev) => {
        const next = new Set(prev);
        next.delete(narrativeId);
        return next;
      });
      showToast(error.message || 'Failed to fade narrative');
    }
  };

  const cryptoNarratives = useMemo(() => {
    return localNarratives.filter(
      (narrative) =>
        narrative.category === 'crypto' &&
        narrative.assets.some(isCryptoAsset)
    );
  }, [localNarratives]);

  const visibleNarratives = useMemo(() => {
    return cryptoNarratives.filter((narrative) => !fadedNarratives.has(narrative.id));
  }, [cryptoNarratives, fadedNarratives]);

  const marketRooms = useMemo(() => {
    return visibleNarratives.slice(0, 4).map((room) => ({
      id: room.id,
      title: room.title,
      active: room.insights.change.current,
      latest: room.insights.headlines[0]?.title || room.insights.reason,
      headlines: room.insights.headlines,
      sources: room.insights.sources,
      narrative: room,
    }));
  }, [visibleNarratives]);

  const openRoomSheet = (room: any) => {
    setSheetMode('room');
    setSheetData(room);
    setSheetVisible(true);
  };

  useEffect(() => {
    const fetchRoomMessages = async () => {
      if (!sheetData?.id) return;
      const effectiveUserId = userId || '11111111-1111-1111-1111-111111111111';
      try {
        setRoomLoading(true);
        setRoomError(null);
        const messages = await CommunityService.getRoomMessages(effectiveUserId, sheetData.id, 50);
        setRoomMessages(messages);
      } catch (error: any) {
        setRoomError(error.message || 'Failed to load room messages');
      } finally {
        setRoomLoading(false);
      }
    };

    if (sheetVisible && sheetMode === 'room') {
      fetchRoomMessages();
    }
  }, [sheetVisible, sheetMode, sheetData?.id, userId]);

  const handleSendRoomMessage = async () => {
    // Use default userId if not set (same pattern as useCommunityData)
    const effectiveUserId = userId || '11111111-1111-1111-1111-111111111111';
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:363',message:'handleSendRoomMessage called',data:{hasUserId:!!userId,effectiveUserId,hasSheetDataId:!!sheetData?.id,roomInputLength:roomInput.length,roomInputTrimmed:roomInput.trim().length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!sheetData?.id) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:368',message:'Early return - missing sheetData.id',data:{sheetDataId:sheetData?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    const trimmed = roomInput.trim();
    if (!trimmed) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:376',message:'Early return - empty input',data:{roomInput,trimmed},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }

    const prefix =
      roomMessageType === 'bull'
        ? '📈 Bull case: '
        : roomMessageType === 'bear'
        ? '📉 Bear case: '
        : roomMessageType === 'question'
        ? '❓ Question: '
        : roomMessageType === 'source'
        ? '🔗 Source: '
        : '🧠 Insight: ';

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:393',message:'Calling postRoomMessage API',data:{effectiveUserId,sheetDataId:sheetData.id,messageText:`${prefix}${trimmed}`.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      const message = await CommunityService.postRoomMessage(effectiveUserId, sheetData.id, `${prefix}${trimmed}`);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:398',message:'postRoomMessage success',data:{messageId:message.id,messageText:message.text?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      setRoomMessages((prev) => [message, ...prev]);
      setRoomInput('');
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:404',message:'postRoomMessage error',data:{errorMessage:error.message,errorType:error.constructor.name},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      setRoomError(error.message || 'Failed to post message');
    }
  };

  const handleDeleteRoomMessage = async (messageId: string) => {
    // Use default userId if not set (same pattern as useCommunityData)
    const effectiveUserId = userId || '11111111-1111-1111-1111-111111111111';
    
    if (!sheetData?.id) {
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:419',message:'handleDeleteRoomMessage called',data:{effectiveUserId,messageId,sheetDataId:sheetData.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    try {
      await CommunityService.deleteRoomMessage(effectiveUserId, sheetData.id, messageId);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:425',message:'deleteRoomMessage success',data:{messageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      setRoomMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CommunityScreen.tsx:430',message:'deleteRoomMessage error',data:{errorMessage:error.message,errorType:error.constructor.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      setRoomError(error.message || 'Failed to delete message');
    }
  };

  const sheetVelocity = sheetMode === 'crypto' && sheetData ? getVelocitySnapshot(sheetData) : null;

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
          scrollEnabled={activeSection !== 'leaderboard'}
          nestedScrollEnabled={activeSection === 'leaderboard'}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Community</Text>
            <Pressable
              onPress={() => {
                console.log('QR BUTTON PRESSED!');
                handleQRPress();
              }}
              style={styles.qrButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="qr-code-outline" size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>
            Hey, @alice
          </Text>
          <View style={styles.greetingStats}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>7-day streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={styles.statValue}>55 pts</Text>
            </View>
          </View>
        </View>

        {/* Section Navigation */}
        <View style={styles.sectionNav}>
          <Pressable
            onPress={() => setActiveSection('leaderboard')}
            style={[
              styles.sectionNavButton,
              activeSection === 'leaderboard' && styles.sectionNavButtonActive,
            ]}
          >
            <Text
              style={[
                styles.sectionNavText,
                activeSection === 'leaderboard' && styles.sectionNavTextActive,
              ]}
            >
              Leaderboard
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSection('global')}
            style={[
              styles.sectionNavButton,
              activeSection === 'global' && styles.sectionNavButtonActive,
            ]}
          >
            <Text
              style={[
                styles.sectionNavText,
                activeSection === 'global' && styles.sectionNavTextActive,
              ]}
            >
              Global
            </Text>
          </Pressable>
        </View>

        {/* Leaderboard - Full Section Flip */}
        {activeSection === 'leaderboard' && (
        <View style={styles.flipContainer}>
          {/* Front Side - All Users */}
          <Animated.View style={[styles.flipCard, styles.flipCardFront, frontAnimatedStyle]}>
            <GlowingBorder
              style={styles.sectionContainer}
              glowColor="rgba(255, 255, 255, 0.2)"
              disabled={false}
              glow={false}
              spread={8}
              proximity={0}
              inactiveZone={0.7}
              movementDuration={2000}
              borderWidth={0.15}
            >
              <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Leaderboard</Text>
                  <View style={styles.headerRight}>
                    <Pressable onPress={handleFlip} style={styles.flipButton}>
                      <Animated.View style={flipButtonIconStyle}>
                        <Ionicons 
                          name="people-outline" 
                          size={18} 
                          color={theme.colors.textSecondary} 
                        />
                      </Animated.View>
                    </Pressable>
                  </View>
                </View>

                {/* Filter Tags */}
                <View style={styles.filterTags}>
                  {(['today', 'week', 'month', 'all-time'] as LeaderboardPeriod[]).map((period) => (
                    <Pressable
                      key={period}
                      onPress={() => handlePeriodSelect(period)}
                      style={[
                        styles.filterTag,
                        leaderboardPeriod === period && styles.filterTagActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterTagText,
                          leaderboardPeriod === period && styles.filterTagTextActive,
                        ]}
                      >
                        {period === 'all-time' ? 'all time' : period}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <ScrollView 
                  style={styles.tableScrollView}
                  contentContainerStyle={styles.tableScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, styles.rankCol]}>Rank</Text>
                      <Text style={[styles.tableHeaderText, styles.userCol]}>User</Text>
                      <Text style={[styles.tableHeaderText, styles.returnCol]}>Return</Text>
                      <Text style={[styles.tableHeaderText, styles.winRateCol]}>Win Rate</Text>
                    </View>

                    {leaderboardLoading && (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#FF6B35" />
                        <Text style={styles.loadingText}>Loading leaderboard...</Text>
                      </View>
                    )}

                    {leaderboardError && !leaderboardLoading && (
                      <View style={styles.errorRow}>
                        <Text style={styles.errorText}>{leaderboardError}</Text>
                      </View>
                    )}

                    {!leaderboardLoading && !leaderboardError && globalLeaderboard.map((entry) => (
                      <View key={entry.userId} style={styles.tableRow}>
                        <View style={styles.rankCol}>
                          <Text style={styles.rankText}>#{entry.rank}</Text>
                        </View>
                        <View style={styles.userCol}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {entry.username.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.username}>{entry.username}</Text>
                        </View>
                        <View style={styles.returnCol}>
                          <Text style={[styles.returnText, { color: theme.colors.bullish }]}>
                            +{entry.returnPercent}%
                          </Text>
                        </View>
                        <View style={styles.winRateCol}>
                          <Text style={styles.winRateText}>{entry.winRate}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </GlowingBorder>
          </Animated.View>

          {/* Back Side - Friends Only */}
          <Animated.View style={[styles.flipCard, styles.flipCardBack, backAnimatedStyle]}>
            <GlowingBorder
              style={styles.sectionContainer}
              glowColor="rgba(255, 255, 255, 0.2)"
              disabled={false}
              glow={false}
              spread={8}
              proximity={0}
              inactiveZone={0.7}
              movementDuration={2000}
              borderWidth={0.15}
            >
              <View style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Friends Leaderboard</Text>
                  <View style={styles.headerRight}>
                    <Pressable onPress={handleFlip} style={styles.flipButton}>
                      <Animated.View style={flipButtonIconStyle}>
                        <Ionicons 
                          name="people" 
                          size={18} 
                          color="#FF6B35" 
                        />
                      </Animated.View>
                    </Pressable>
                  </View>
                </View>

                {/* Filter Tags */}
                <View style={styles.filterTags}>
                  {(['today', 'week', 'month', 'all-time'] as LeaderboardPeriod[]).map((period) => (
                    <Pressable
                      key={period}
                      onPress={() => handlePeriodSelect(period)}
                      style={[
                        styles.filterTag,
                        leaderboardPeriod === period && styles.filterTagActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterTagText,
                          leaderboardPeriod === period && styles.filterTagTextActive,
                        ]}
                      >
                        {period === 'all-time' ? 'all time' : period}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <ScrollView 
                  style={styles.tableScrollView}
                  contentContainerStyle={styles.tableScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, styles.rankCol]}>Rank</Text>
                      <Text style={[styles.tableHeaderText, styles.userCol]}>User</Text>
                      <Text style={[styles.tableHeaderText, styles.returnCol]}>Return</Text>
                      <Text style={[styles.tableHeaderText, styles.winRateCol]}>Win Rate</Text>
                    </View>

                    {leaderboardLoading && (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#FF6B35" />
                        <Text style={styles.loadingText}>Loading leaderboard...</Text>
                      </View>
                    )}

                    {leaderboardError && !leaderboardLoading && (
                      <View style={styles.errorRow}>
                        <Text style={styles.errorText}>{leaderboardError}</Text>
                      </View>
                    )}

                    {!leaderboardLoading && !leaderboardError && friendsLeaderboard.map((entry) => (
                      <View key={entry.userId} style={styles.tableRow}>
                        <View style={styles.rankCol}>
                          <Text style={styles.rankText}>#{entry.rank}</Text>
                        </View>
                        <View style={styles.userCol}>
                          <View style={[styles.avatar, entry.userId === userId && styles.avatarYou]}>
                            <Text style={styles.avatarText}>
                              {entry.username.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={[styles.username, entry.userId === userId && styles.usernameYou]}>
                            {entry.username}
                          </Text>
                        </View>
                        <View style={styles.returnCol}>
                          <Text style={[styles.returnText, { color: theme.colors.bullish }]}>
                            +{entry.returnPercent}%
                          </Text>
                        </View>
                        <View style={styles.winRateCol}>
                          <Text style={styles.winRateText}>{entry.winRate}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </GlowingBorder>
          </Animated.View>
        </View>
        )}

        {/* Global - Market Narratives & Social Feed */}
        {activeSection === 'global' && (
        <>
        {/* Market Narratives */}
        <GlowingBorder
          style={styles.sectionContainer}
          glowColor="rgba(255, 255, 255, 0.2)"
          disabled={false}
          glow={false}
          spread={8}
          proximity={0}
          inactiveZone={0.7}
          movementDuration={2000}
          borderWidth={0.15}
        >
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Market Narratives</Text>
            {narrativesLoading && (
              <Text style={styles.loadingText}>Loading narratives...</Text>
            )}
            {narrativesError && !narrativesLoading && (
              <Text style={styles.errorText}>{narrativesError}</Text>
            )}
            {!narrativesLoading && !narrativesError && cryptoNarratives.length === 0 && (
              <View style={styles.emptyStateBlock}>
                <Text style={styles.emptyStateText}>No active crypto narratives right now</Text>
                <Text style={styles.emptyStateSubtext}>
                  Last updated: {formatTimestamp(lastNarrativesUpdatedAt)}
                </Text>
              </View>
            )}
            {cryptoNarratives.map((narrative) => {
              const isFaded = fadedNarratives.has(narrative.id);

              return (
                <View key={narrative.id}>
                  {/* Narrative Title */}
                  <Text style={styles.narrativePageTitle}>{narrative.title}</Text>
                  
                  <View
                    style={[styles.narrativeCard, isFaded && styles.narrativeCardMuted]}
                  >

                  {/* Current Positions */}
                  {narrative.assets.length > 0 && (() => {
                    // Extract position values from reason text
                    // Format: "223,341 $ETH($736M)" or "$ETH($65.4M)"
                    const positionValues = new Map<string, string>();
                    const reasonText = narrative.insights.reason;
                    
                    // Try to extract values like "$ETH($736M)" or "20,000 $ETH($65.4M)"
                    narrative.assets.forEach((asset) => {
                      const assetSymbol = asset.replace('$', '');
                      // Escape special regex characters
                      const escapedSymbol = assetSymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      
                      // Look for patterns like "$ETH($736M)" or "223,341 $ETH($736M)"
                      // Pattern: (optional number) $SYMBOL($value)
                      const pattern = new RegExp(`(?:\\d+[,\\d]*\\s+)?\\$${escapedSymbol}\\s*\\(([\\$\\d.]+[BMK]?)\\)`, 'gi');
                      let match;
                      let lastValue: string | null = null;
                      
                      // Find all matches (compatible with React Native)
                      while ((match = pattern.exec(reasonText)) !== null) {
                        if (match[1]) {
                          lastValue = match[1];
                        }
                      }
                      
                      if (lastValue) {
                        positionValues.set(asset, lastValue);
                      }
                    });
                    
                    return (
                      <View style={styles.positionsSection}>
                        <Text style={styles.sectionLabel}>Positions</Text>
                        <View style={styles.positionsRow}>
                          {narrative.assets.map((asset) => {
                            const value = positionValues.get(asset);
                            return (
                              <View key={asset} style={styles.positionTag}>
                                <Text style={styles.positionTagText}>
                                  {asset}{value ? `: ${value}` : ''}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}

                  {/* News Widget */}
                  {narrative.insights.headlines && narrative.insights.headlines.length > 0 && (
                    <View style={styles.headlinesSection}>
                      <Text style={styles.sectionLabel}>News</Text>
                      {narrative.insights.headlines.slice(0, 5).map((headline, index) => {
                        // Remove "Current positions:" section from headline text
                        let cleanedTitle = headline.title;
                        // Remove everything from "Current positions:" (case insensitive) to the end
                        const positionsPattern = /\n\s*Current\s+positions?:?\s*\n.*$/is;
                        cleanedTitle = cleanedTitle.replace(positionsPattern, '').trim();
                        
                        return (
                          <Pressable
                            key={`${headline.url}-${index}`}
                            onPress={() => headline.url && Linking.openURL(headline.url)}
                            style={styles.headlineLink}
                          >
                            <Text style={styles.headlineText}>{cleanedTitle}</Text>
                            <Ionicons name="open-outline" size={16} color="rgba(255, 255, 255, 0.5)" />
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  </View>
                </View>
              );
            })}
          </View>
        </GlowingBorder>

        {/* Open Discussion Rooms */}
        <GlowingBorder
          style={styles.sectionContainer}
          glowColor="rgba(255, 255, 255, 0.2)"
          disabled={false}
          glow={false}
          spread={8}
          proximity={0.7}
          inactiveZone={0.7}
          movementDuration={2000}
          borderWidth={0.15}
        >
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Open discussion rooms</Text>
            {marketRooms.length === 0 && (
              <Text style={styles.emptyStateText}>No active rooms yet</Text>
            )}
            {marketRooms.map((room) => (
              <Pressable
                key={room.id}
                style={styles.roomRow}
                onPress={() => openRoomSheet(room)}
              >
                <View style={styles.roomHeader}>
                  <Text style={styles.roomTitle}>{room.title}</Text>
                  <Text style={styles.roomMeta}>{room.active} signals active</Text>
                </View>
                <Text style={styles.roomLatest} numberOfLines={1}>
                  Latest headline ▸ {room.latest}
                </Text>
                <View style={styles.roomCTA}>
                  <Text style={styles.roomCTAText}>Open room</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </GlowingBorder>
        </>
        )}
        </ScrollView>
      </SafeAreaView>
      
      {/* QR Code Modal */}
      <QRCodeModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        userId={userId || ''}
        username={username || ''}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        userId={userId || ''}
        onFriendAdded={handleFriendAdded}
      />

      {/* Bottom Sheet */}
      <Modal visible={sheetVisible} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetVisible(false)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            {sheetMode === 'crypto' && sheetData && (
              <>
                <Text style={styles.sheetTitle}>{sheetData.title}</Text>
                <Text style={styles.sheetSubtitle}>Narrative snapshot</Text>
                <Text style={styles.sheetMeta}>
                  {sheetVelocity?.direction ?? '—'} {sheetVelocity?.percent ?? 0}% (24h) ·{' '}
                  {sheetData.insights.sources.length} sources ·{' '}
                  {getConfidenceLabel(sheetData.insights.confidence.level)} confidence
                </Text>
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetWhy} numberOfLines={3}>
                    Why: {getWhyLine(sheetData.insights.reason)}
                  </Text>
                </View>
                {sheetData.insights.headlines?.length > 0 && (
                  <>
                    <Text style={styles.sheetSubtitle}>Latest headlines</Text>
                    <View style={styles.sheetSection}>
                      {sheetData.insights.headlines.slice(0, 3).map((headline: { title: string; url: string }, index: number) => (
                        <Pressable
                          key={`${headline.title}-${index}`}
                          onPress={() => headline.url && Linking.openURL(headline.url)}
                          style={styles.sheetHeadlineLink}
                        >
                          <Text style={styles.sheetBullet}>
                            • {headline.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
                {sheetData.insights.sources?.length > 0 && (
                  <>
                    <Text style={styles.sheetSubtitle}>Sources</Text>
                    <View style={styles.sheetSources}>
                      {(sheetData.insights.sources || []).map((source: string) => (
                        <View key={source} style={styles.sourcePill}>
                          <Text style={styles.sourcePillText}>{source.toUpperCase()}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
            {sheetMode === 'room' && sheetData && (
              <>
                <Text style={styles.sheetTitle}>{sheetData.title}</Text>
                <Text style={styles.sheetSubtitle}>Market room</Text>

                <View style={styles.messageTypeRow}>
                  {([
                    { key: 'bull', label: 'Bull' },
                    { key: 'bear', label: 'Bear' },
                    { key: 'question', label: 'Question' },
                    { key: 'insight', label: 'Insight' },
                    { key: 'source', label: 'Source' },
                  ] as const).map((type) => (
                    <Pressable
                      key={type.key}
                      style={[
                        styles.messageTypePill,
                        roomMessageType === type.key && styles.messageTypePillActive,
                      ]}
                      onPress={() => setRoomMessageType(type.key)}
                    >
                      <Text
                        style={[
                          styles.messageTypeText,
                          roomMessageType === type.key && styles.messageTypeTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.roomMessages}>
                  {roomLoading && <Text style={styles.loadingText}>Loading room…</Text>}
                  {roomError && <Text style={styles.errorText}>{roomError}</Text>}
                  {!roomLoading && !roomError && roomMessages.length === 0 && (
                    <Text style={styles.emptyStateText}>Be the first to add a take</Text>
                  )}
                  {roomMessages.map((message) => {
                    const effectiveUserId = userId || '11111111-1111-1111-1111-111111111111';
                    const isOwnMessage = message.userId === effectiveUserId;
                    
                    return (
                      <View key={message.id} style={styles.roomMessageRow}>
                        <View style={styles.roomMessageHeader}>
                          <Text style={styles.roomMessageAuthor}>@{message.username}</Text>
                          {isOwnMessage && (
                            <Pressable
                              onPress={() => handleDeleteRoomMessage(message.id)}
                              style={styles.roomMessageDeleteButton}
                            >
                              <Ionicons name="trash-outline" size={16} color="rgba(255, 255, 255, 0.5)" />
                            </Pressable>
                          )}
                        </View>
                        <Text style={styles.roomMessageText}>{message.text}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.roomComposer}>
                  <TextInput
                    value={roomInput}
                    onChangeText={setRoomInput}
                    placeholder="Add a short take…"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.roomInput}
                    multiline
                  />
                  <Pressable style={styles.roomSendButton} onPress={handleSendRoomMessage}>
                    <Text style={styles.roomSendButtonText}>Post</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  greetingText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.regular,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  greetingStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statIcon: {
    fontSize: 16,
  },
  statValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: '#FFFFFF',
  },
  sectionNav: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  sectionNavButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  sectionNavButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  sectionNavText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sectionNavTextActive: {
    color: '#FF6B35',
    fontWeight: theme.typography.weights.semibold,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  qrButton: {
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  sectionContainer: {
    padding: 2, // Only enough space for the gradient border
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  sectionContent: {
    padding: theme.spacing.lg, // Normal spacing lives here
    borderRadius: theme.borderRadius.lg - 2,
  },
  glassInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.lg,
    pointerEvents: 'none',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },
  disclaimer: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  filterTags: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    flexWrap: 'wrap',
  },
  filterTag: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterTagActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  filterTagText: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'capitalize',
    fontWeight: theme.typography.weights.medium,
  },
  filterTagTextActive: {
    color: '#FF6B35',
    fontWeight: theme.typography.weights.semibold,
  },
  filterContainer: {
    position: 'relative',
  },
  periodFilterButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(8, 8, 12, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    minWidth: 120,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  filterHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(8, 8, 12, 1)',
  },
  filterHeaderText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterMenuItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#1A1A1A',
  },
  filterMenuItemActive: {
    backgroundColor: '#2A1505',
  },
  filterMenuText: {
    fontSize: theme.typography.sizes.sm,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  filterMenuTextActive: {
    color: '#FF6B35',
    fontWeight: theme.typography.weights.semibold,
  },
  flipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  flipButtonText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold,
  },
  flipButtonTextActive: {
    color: '#FF6B35',
  },
  periodToggle: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  flipContainer: {
    width: '100%',
    height: 500, // Height to show header, filters, and top 5 rows
    position: 'relative',
  },
  flipCard: {
    position: 'absolute',
    width: '100%',
    top: 0,
    left: 0,
    right: 0,
  },
  flipCardFront: {
    zIndex: 1,
  },
  flipCardBack: {
    zIndex: 0,
  },
  periodButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  periodButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  periodText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'capitalize',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
  },
  tableScrollView: {
    maxHeight: 380, // Height to show exactly 5 rows initially (table header + 5 rows + gaps)
  },
  tableScrollContent: {
    paddingBottom: theme.spacing.xs,
  },
  table: {
    gap: theme.spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tableHeaderText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: theme.typography.sizes.sm,
  },
  errorRow: {
    paddingVertical: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
  },
  rankCol: {
    width: 50,
  },
  userCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  returnCol: {
    width: 80,
    alignItems: 'flex-end',
  },
  winRateCol: {
    width: 70,
    alignItems: 'flex-end',
  },
  rankText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  avatarYou: {
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.6)',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  username: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
  },
  usernameYou: {
    fontWeight: theme.typography.weights.semibold,
    color: '#FF6B35',
  },
  returnText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  winRateText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Market Narratives Styles
  narrativeCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(8, 8, 12, 0.6)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  narrativeCardMuted: {
    opacity: 0.5,
  },
  narrativePageTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  narrativeTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.md,
  },
  positionsSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  positionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  positionTag: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  positionTagText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#FF6B35',
  },
  headlinesSection: {
    marginBottom: theme.spacing.md,
  },
  headlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headlineText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: theme.typography.sizes.sm * 1.4,
  },
  narrativeCompactCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(8, 8, 12, 0.6)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  narrativeCompactCardMuted: {
    opacity: 0.5,
  },
  narrativeCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  narrativeCompactTitle: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  narrativeCompactMeta: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: theme.spacing.xs,
  },
  narrativeCompactWhy: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.sm,
  },
  narrativeCompactActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  velocityBadge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },
  velocityBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: '#FF6B35',
  },
  narrativeHeader: {
    marginBottom: theme.spacing.md,
  },
  narrativeTrending: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
    lineHeight: theme.typography.sizes.lg * 1.3,
  },
  narrativeMetrics: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  narrativeWhy: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  narrativeWhyText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.relaxed,
  },
  pulseContainer: {
    marginBottom: theme.spacing.lg,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pulseLabel: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    minWidth: 90,
  },
  pulseBar: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  pulseSegment: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  pulseSegmentActive: {
    backgroundColor: '#FF6B35',
  },
  pulseSegmentInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pulseLevel: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    minWidth: 90,
    textAlign: 'right',
  },
  pulseDetail: {
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  pulseDetailText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  whyCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: theme.spacing.lg,
  },
  whyCardTitle: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  whyCardText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  whyCardBullet: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: theme.spacing.xs,
  },
  sourceStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sourcePill: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sourcePillText: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  deltaCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: theme.spacing.lg,
  },
  deltaTitle: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  deltaLine: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.xs,
  },
  scenarioContainer: {
    marginBottom: theme.spacing.lg,
  },
  scenarioChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: theme.spacing.sm,
  },
  scenarioChipActive: {
    borderColor: '#FF6B35',
  },
  scenarioChipText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scenarioText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: theme.spacing.xs,
  },
  mapContainer: {
    marginBottom: theme.spacing.lg,
  },
  mapNode: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  mapNodeText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mapLine: {
    width: 2,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: theme.spacing.xs,
  },
  mapClear: {
    marginTop: theme.spacing.sm,
  },
  mapClearText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.bullish,
  },
  cryptoSignalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  cryptoAsset: {
    width: 52,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  cryptoEvent: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: theme.spacing.sm,
  },
  cryptoReaction: {
    width: 70,
    textAlign: 'right',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cryptoBullish: {
    color: theme.colors.bullish,
  },
  cryptoBearish: {
    color: theme.colors.bearish,
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyStateBlock: {
    paddingVertical: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: theme.spacing.xs,
  },
  roomRow: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  roomTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  roomMeta: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  roomLatest: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  roomCTA: {
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },
  roomCTAText: {
    fontSize: theme.typography.sizes.xs,
    color: '#FF6B35',
    fontWeight: theme.typography.weights.semibold,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F0A06',
    padding: theme.spacing.lg,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },
  sheetSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  sheetSection: {
    marginBottom: theme.spacing.lg,
  },
  sheetMeta: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: theme.spacing.sm,
  },
  sheetWhy: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  sheetBullet: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.xs,
  },
  sheetHeadlineLink: {
    marginBottom: theme.spacing.xs,
  },
  sheetSources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  messageTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  messageTypePill: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  messageTypePillActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },
  messageTypeText: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageTypeTextActive: {
    color: '#FF6B35',
    fontWeight: theme.typography.weights.semibold,
  },
  roomMessages: {
    marginBottom: theme.spacing.lg,
  },
  roomMessageRow: {
    marginBottom: theme.spacing.sm,
  },
  roomMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  roomMessageAuthor: {
    fontSize: theme.typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  roomMessageDeleteButton: {
    padding: theme.spacing.xs,
  },
  roomMessageText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  roomComposer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: theme.spacing.md,
  },
  roomInput: {
    minHeight: 48,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },
  roomSendButton: {
    alignSelf: 'flex-end',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: '#FF6B35',
  },
  roomSendButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#0F0A06',
  },
  actionChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.5)',
  },
  actionChipMuted: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionChipText: {
    fontSize: theme.typography.sizes.sm,
    color: '#FFFFFF',
  },
  actionChipSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  narrativeSignalRow: {
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  narrativeSignal: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.bullish,
  },
  narrativeDetails: {
    marginTop: theme.spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.5)',
    minWidth: 110,
  },
  metricValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.bullish,
    flex: 1,
  },
  metricPeriod: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.regular,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  metricDescription: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  metricMarket: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.bullish,
    flex: 1,
  },
  narrativeTimeline: {
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  narrativeConfidence: {
    marginTop: theme.spacing.md,
  },
  confidenceText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: theme.typography.weights.semibold,
  },
  confidenceDrivers: {
    marginTop: theme.spacing.xs,
  },
  confidenceDriverText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  narrativeNext: {
    marginTop: theme.spacing.md,
  },
  narrativeNextText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.relaxed,
  },
  timelineTitle: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  timelineEvents: {
    gap: theme.spacing.xs,
  },
  timelineEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  timelineTime: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.5)',
    minWidth: 50,
  },
  timelineDescription: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
  narrativeCTAs: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  followButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: '#FF6B35',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  fadeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  fadeButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  carousel: {
    marginTop: theme.spacing.md,
  },
  carouselContent: {
    gap: theme.spacing.md,
  },
  portfolioCard: {
    width: 280,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(15, 15, 20, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  celebrityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  celebrityAvatarText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  portfolioInfo: {
    flex: 1,
  },
  celebrityName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  strategyLabel: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  holdingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  portfolioReturn: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
  },
  postCard: {
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  postAvatarText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  postHandle: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  postContent: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
    marginBottom: theme.spacing.md,
  },
  postSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: theme.spacing.xs,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tickersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  likesCount: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  toastContainer: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.xl,
    backgroundColor: 'rgba(15, 15, 20, 0.95)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  toastText: {
    fontSize: theme.typography.sizes.sm,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

