import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { GlowingBorder } from '@ui/primitives/GlowingBorder';
import { Pill } from '@ui/components/Pill';
import { theme } from '@app/theme';
import * as Haptics from 'expo-haptics';
import { useLearnStore } from '@app/store';
import {
  mockLeaderboard,
  mockFriendsLeaderboard,
  mockCelebrityPortfolios,
  mockSocialPosts,
  LeaderboardEntry,
  CelebrityPortfolio,
  SocialPost,
} from '../models';
import { QRCodeModal } from '../components/QRCodeModal';
import { Avatar } from '../components/Avatar';

type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all-time';
type CommunitySection = 'leaderboard' | 'global';

export const CommunityScreen: React.FC = () => {
  const { streak: storeStreak, totalXP: storeTotalXP } = useLearnStore();
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('today');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeSection, setActiveSection] = useState<CommunitySection>('leaderboard');
  const [showQRModal, setShowQRModal] = useState(false);
  const flipRotation = useSharedValue(0);
  
  // Mock username - in real app, get from user store
  const username = 'TechBull';
  // Use mock values if store values are 0, otherwise use store values
  const streak = storeStreak > 0 ? storeStreak : 42;
  const totalXP = storeTotalXP > 0 ? storeTotalXP : 1250;

  const handlePeriodSelect = (period: LeaderboardPeriod) => {
    setLeaderboardPeriod(period);
    setShowFilterMenu(false);
  };

  const handleFlip = () => {
    // Safe haptic call - no-op on web
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Silently fail if haptics are not available
      }
    }
    const newIsFlipped = !isFlipped;
    setIsFlipped(newIsFlipped);
    flipRotation.value = withTiming(newIsFlipped ? 180 : 0, { duration: 600 });
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

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getSentimentColor = (sentiment: SocialPost['sentiment']) => {
    switch (sentiment) {
      case 'bullish':
        return theme.colors.bullish;
      case 'bearish':
        return theme.colors.bearish;
      default:
        return theme.colors.neutral;
    }
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
          scrollEnabled={activeSection !== 'leaderboard'}
          nestedScrollEnabled={activeSection === 'leaderboard'}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Community</Text>
            <Pressable
              onPress={() => {
                // Safe haptic call - no-op on web
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (error) {
                    // Silently fail if haptics are not available
                  }
                }
                setShowQRModal(true);
              }}
              style={styles.qrButton}
            >
              <Ionicons name="qr-code-outline" size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Hey, @{username}</Text>
          <View style={styles.greetingStats}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>{streak}-day streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={styles.statValue}>{totalXP.toLocaleString()} pts</Text>
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

                    {mockLeaderboard.map((entry) => (
                      <View key={entry.userId} style={styles.tableRow}>
                        <View style={styles.rankCol}>
                          <Text style={styles.rankText}>#{entry.rank}</Text>
                        </View>
                        <View style={styles.userCol}>
                          <Avatar
                            userId={entry.userId}
                            username={entry.username}
                            size={32}
                          />
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

                    {mockFriendsLeaderboard.map((entry) => (
                      <View key={entry.userId} style={styles.tableRow}>
                        <View style={styles.rankCol}>
                          <Text style={styles.rankText}>#{entry.rank}</Text>
                        </View>
                        <View style={styles.userCol}>
                          <Avatar
                            userId={entry.userId}
                            username={entry.username}
                            size={32}
                            isYou={entry.userId === 'user-you'}
                          />
                          <Text style={[styles.username, entry.userId === 'user-you' && styles.usernameYou]}>
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
            
            {/* Main Narrative Signal Card */}
            <View style={styles.narrativeCard}>
              <View style={styles.narrativeHeader}>
                <Text style={styles.narrativeTrending}>🔥 AI is trending on X</Text>
              </View>
              
              <View style={styles.narrativeMetrics}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Mentions:</Text>
                  <Text style={styles.metricValue}>▲ +280% <Text style={styles.metricPeriod}>(24h)</Text></Text>
                </View>
                
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Trigger:</Text>
                  <Text style={styles.metricDescription}>Public comments by Elon Musk</Text>
                </View>
                
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Market reaction:</Text>
                  <Text style={styles.metricMarket}>AI basket +2.4%</Text>
                </View>
              </View>

              {/* Timeline */}
              <View style={styles.narrativeTimeline}>
                <Text style={styles.timelineTitle}>Timeline</Text>
                <View style={styles.timelineEvents}>
                  <View style={styles.timelineEvent}>
                    <Text style={styles.timelineTime}>09:12</Text>
                    <Text style={styles.timelineDescription}>AI mentions spike</Text>
                  </View>
                  <View style={styles.timelineEvent}>
                    <Text style={styles.timelineTime}>10:40</Text>
                    <Text style={styles.timelineDescription}>Public figure comment</Text>
                  </View>
                  <View style={styles.timelineEvent}>
                    <Text style={styles.timelineTime}>11:15</Text>
                    <Text style={styles.timelineDescription}>Market reaction</Text>
                  </View>
                </View>
              </View>

              {/* CTAs */}
              <View style={styles.narrativeCTAs}>
                <Pressable style={styles.followButton}>
                  <Text style={styles.followButtonText}>Follow narrative</Text>
                </Pressable>
                <Pressable style={styles.fadeButton}>
                  <Text style={styles.fadeButtonText}>Fade narrative</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </GlowingBorder>

        {/* Social Feed */}
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
            <Text style={styles.sectionTitle}>Social Feed</Text>

          {mockSocialPosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Avatar
                  username={post.handle.replace('@', '')}
                  size={40}
                  style={styles.postAvatar}
                />
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{post.author}</Text>
                  <Text style={styles.postHandle}>{post.handle} · {formatTimeAgo(post.timestamp)}</Text>
                </View>
                <Pill
                  variant={
                    post.sentiment === 'bullish'
                      ? 'success'
                      : post.sentiment === 'bearish'
                      ? 'error'
                      : 'secondary'
                  }
                >
                  {post.sentiment}
                </Pill>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              {post.tickersMentioned.length > 0 && (
                <View style={styles.tickersRow}>
                  {post.tickersMentioned.map((ticker) => (
                    <Pill key={ticker} variant="secondary">
                      ${ticker}
                    </Pill>
                  ))}
                </View>
              )}

              <View style={styles.postFooter}>
                <View style={styles.postActions}>
                  <Ionicons name="heart-outline" size={18} color={theme.colors.textTertiary} />
                  <Text style={styles.likesCount}>{post.likes}</Text>
                </View>
              </View>
            </View>
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
        username={username}
      />
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
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
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
    padding: theme.spacing.xs,
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
    marginRight: theme.spacing.md,
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
});
