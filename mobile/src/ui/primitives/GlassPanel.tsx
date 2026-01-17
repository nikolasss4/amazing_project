import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '@app/theme';

interface GlassPanelProps extends ViewProps {
  children?: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderless?: boolean;
}

/**
 * GlassPanel - Reusable liquid glass component
 * Frosted blur background with subtle border and highlight
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  intensity = 20,
  tint = 'dark',
  borderless = false,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={[styles.overlay, borderless && styles.borderless]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.glassBackground,
  },
  overlay: {
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  borderless: {
    borderWidth: 0,
  },
});
