import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@app/theme';

interface GlassPanelProps extends ViewProps {
  children?: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderless?: boolean;
  variant?: 'default' | 'silver';
}

/**
 * GlassPanel - Reusable liquid glass component
 * Frosted blur background with subtle border and highlight
 * Supports silver gradient variant for premium cards
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  intensity = 20,
  tint = 'dark',
  borderless = false,
  variant = 'default',
  style,
  ...props
}) => {
  const isSilver = variant === 'silver';

  return (
    <View style={[styles.container, style]} {...props}>
      {isSilver ? (
        <>
          {/* Silver gradient background with liquid glass effect */}
          <LinearGradient
            colors={[
              'rgba(180, 190, 200, 0.15)',
              'rgba(150, 165, 180, 0.25)',
              'rgba(120, 135, 150, 0.2)',
              'rgba(160, 175, 190, 0.18)',
            ]}
            locations={[0, 0.3, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Glass blur overlay for liquid effect */}
          <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
          {/* Subtle shimmer highlight */}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.1)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
          />
        </>
      ) : (
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      )}
      <View style={[
        styles.overlay,
        borderless && styles.borderless,
        isSilver && styles.silverBorder
      ]}>
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
  silverBorder: {
    borderColor: 'rgba(200, 210, 220, 0.3)',
  },
});
