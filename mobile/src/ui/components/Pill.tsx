import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '@app/theme';

interface PillProps {
  children: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  style?: ViewStyle;
}

/**
 * Pill - Small badge/tag component
 */
export const Pill: React.FC<PillProps> = ({ children, variant = 'default', style }) => {
  return (
    <View style={[styles.container, styles[variant], style]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.pill,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: theme.colors.glassBackground,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  success: {
    backgroundColor: theme.colors.successMuted,
  },
  error: {
    backgroundColor: theme.colors.errorMuted,
  },
  warning: {
    backgroundColor: theme.colors.warningMuted,
  },
  text: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  text_default: {
    color: theme.colors.textSecondary,
  },
  text_success: {
    color: theme.colors.success,
  },
  text_error: {
    color: theme.colors.error,
  },
  text_warning: {
    color: theme.colors.warning,
  },
});
