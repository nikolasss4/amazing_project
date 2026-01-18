import React from 'react';
import { View, Text, Image, StyleSheet, ImageStyle, ViewStyle, TextStyle } from 'react-native';
import { theme } from '@app/theme';
import { getAvatarSource } from '../utils/avatarUtils';

interface AvatarProps {
  userId?: string;
  username?: string;
  size?: number;
  style?: ViewStyle;
  showBorder?: boolean;
  borderColor?: string;
  isYou?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  userId,
  username,
  size = 32,
  style,
  showBorder = false,
  borderColor,
  isYou = false,
}) => {
  const avatarSource = getAvatarSource(userId, username);
  const displayName = username || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();
  const borderRadius = size / 2;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor: isYou 
      ? 'rgba(255, 107, 53, 0.15)' 
      : 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: isYou ? 2 : (showBorder ? 1 : 0),
    borderColor: isYou 
      ? 'rgba(255, 107, 53, 0.6)' 
      : (borderColor || 'rgba(255, 255, 255, 0.12)'),
    overflow: 'hidden',
    ...style,
  };

  if (avatarSource) {
    return (
      <View style={containerStyle}>
        <Image
          source={avatarSource}
          style={{
            width: size,
            height: size,
            borderRadius,
          } as ImageStyle}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback to initials
  return (
    <View style={containerStyle}>
      <Text
        style={{
          fontSize: size * 0.35,
          fontWeight: theme.typography.weights.bold,
          color: '#FFFFFF',
        } as TextStyle}
      >
        {initials}
      </Text>
    </View>
  );
};
