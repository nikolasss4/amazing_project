import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Pill } from '@ui/components/Pill';
import { theme } from '@app/theme';
import {
  mockLeaderboard,
  mockCelebrityPortfolios,
  mockSocialPosts,
  LeaderboardEntry,
  CelebrityPortfolio,
  SocialPost,
} from '../models';

type LeaderboardPeriod = 'today' | 'week' | 'month';

export const CommunityScreen: React.FC = () => {
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('today');

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Community</Text>
          <Ionicons name="filter" size={24} color={theme.colors.textSecondary} />
        </View>

        {/* Leaderboard */}
        <GlassPanel style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <View style={styles.periodToggle}>
              {(['today', 'week', 'month'] as LeaderboardPeriod[]).map((period) => (
                <Pressable
                  key={period}
                  onPress={() => setLeaderboardPeriod(period)}
                  style={[
                    styles.periodButton,
                    leaderboardPeriod === period && styles.periodButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      leaderboardPeriod === period && styles.periodTextActive,
                    ]}
                  >
                    {period}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Leaderboard Table */}
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
        </GlassPanel>

        {/* Celebrity Portfolios */}
        <GlassPanel style={styles.section}>
          <Text style={styles.sectionTitle}>Celebrity Portfolios</Text>
          <Text style={styles.disclaimer}>
            Mock data from public sources
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
          >
            {mockCelebrityPortfolios.map((portfolio) => (
              <GlassPanel key={portfolio.id} style={styles.portfolioCard}>
                <View style={styles.portfolioHeader}>
                  <View style={styles.celebrityAvatar}>
                    <Text style={styles.celebrityAvatarText}>
                      {portfolio.name.substring(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.portfolioInfo}>
                    <Text style={styles.celebrityName}>{portfolio.name}</Text>
                    <Text style={styles.strategyLabel}>{portfolio.strategyLabel}</Text>
                  </View>
                </View>

                <View style={styles.holdingsRow}>
                  {portfolio.topHoldings.map((holding) => (
                    <Pill key={holding}>{holding}</Pill>
                  ))}
                </View>

                <Text
                  style={[
                    styles.portfolioReturn,
                    {
                      color:
                        portfolio.returnPercent >= 0
                          ? theme.colors.bullish
                          : theme.colors.bearish,
                    },
                  ]}
                >
                  {portfolio.returnPercent >= 0 ? '+' : ''}
                  {portfolio.returnPercent}%
                </Text>
              </GlassPanel>
            ))}
          </ScrollView>
        </GlassPanel>

        {/* Social Feed */}
        <GlassPanel style={styles.section}>
          <Text style={styles.sectionTitle}>Social Feed</Text>

          {mockSocialPosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatar}>
                  <Text style={styles.postAvatarText}>
                    {post.author.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
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
                      : 'warning'
                  }
                >
                  {post.sentiment}
                </Pill>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.postFooter}>
                <View style={styles.tickersRow}>
                  {post.tickersMentioned.map((ticker) => (
                    <Pill key={ticker}>${ticker}</Pill>
                  ))}
                </View>
                <View style={styles.postActions}>
                  <Ionicons name="heart-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.likesCount}>{post.likes}</Text>
                </View>
              </View>
            </View>
          ))}
        </GlassPanel>
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
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  disclaimer: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  periodToggle: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  periodButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.accentMuted,
  },
  periodText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  periodTextActive: {
    color: theme.colors.accent,
  },
  table: {
    gap: theme.spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  tableHeaderText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
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
    color: theme.colors.textSecondary,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  username: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textPrimary,
  },
  returnText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
  },
  winRateText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  celebrityAvatarText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  portfolioInfo: {
    flex: 1,
  },
  celebrityName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  strategyLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
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
    borderTopColor: theme.colors.glassBorder,
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
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  postAvatarText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.accent,
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  postHandle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  postContent: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textPrimary,
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
    color: theme.colors.textSecondary,
  },
});
