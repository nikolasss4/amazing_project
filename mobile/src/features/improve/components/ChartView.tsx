import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { TradingViewChart } from '@features/trade/components/TradingViewChart';
import { theme } from '@app/theme';

interface ChartViewProps {
  symbol: string;
  tradingPair: string;
  timeframe: string;
  isLoading?: boolean;
}

/**
 * ChartView - Wrapper around TradingViewChart for Improve scenarios
 * Displays trading chart with pair label and timeframe
 */
export const ChartView: React.FC<ChartViewProps> = ({
  symbol,
  tradingPair,
  timeframe,
  isLoading = false,
}) => {
  // Convert timeframe to TradingView interval format
  const getInterval = (timeframe: string): string => {
    const map: Record<string, string> = {
      '1M': '1',
      '5M': '5',
      '15M': '15',
      '1H': '60',
      '4H': '240',
      '1D': 'D',
      '1W': 'W',
      '1MO': 'M',
    };
    return map[timeframe] || 'D';
  };

  return (
    <View style={styles.container}>
      {/* Chart */}
      <View style={styles.chartContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        ) : (
          <TradingViewChart symbol={symbol} interval={getInterval(timeframe)} />
        )}
      </View>

      {/* Trading pair label */}
      <View style={styles.labelContainer}>
        <Text style={styles.pairText}>{tradingPair}</Text>
        <View style={styles.divider} />
        <Text style={styles.timeframeText}>{timeframe}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  chartContainer: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundElevated,
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  labelContainer: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  pairText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.glassBorder,
  },
  timeframeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
});
