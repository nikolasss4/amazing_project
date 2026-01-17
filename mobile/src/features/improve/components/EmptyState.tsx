import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';

interface EmptyStateProps {
  onRefresh?: () => void;
}

/**
 * EmptyState - Displayed when no scenarios are available
 * Provides a friendly message and refresh option
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ onRefresh }) => {
  return (
    <View style={styles.container}>
      <GlassPanel style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="school-outline"
            size={64}
            color={theme.colors.textTertiary}
          />
        </View>
        <Text style={styles.title}>No Scenarios Available</Text>
        <Text style={styles.description}>
          New trading scenarios are being prepared for you. Check back soon to continue improving your market intuition.
        </Text>
        {onRefresh && (
          <Button onPress={onRefresh} variant="secondary" style={styles.button}>
            Refresh
          </Button>
        )}
      </GlassPanel>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
    opacity: 0.6,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  button: {
    minWidth: 120,
  },
});
