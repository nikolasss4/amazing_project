import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@app/theme';

// QR Code placeholder component (until react-native-qrcode-svg is installed)
const QRCodePlaceholder: React.FC<{ size: number }> = ({ size }) => {
  // Create a simple grid pattern to simulate QR code
  const gridSize = 25;
  const cellSize = size / gridSize;
  
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from({ length: gridSize * gridSize }).map((_, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        // Create a pattern that looks somewhat like a QR code
        const isDark = (row + col) % 3 === 0 || (row * col) % 7 === 0 || row === 0 || col === 0 || row === gridSize - 1 || col === gridSize - 1;
        return (
          <View
            key={index}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
            }}
          />
        );
      })}
    </View>
  );
};

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
}

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width - 120, 280);

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  username,
}) => {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Generate QR code data - in real app, this would be a user ID, friend code, or URL
  // For now, using a simple format: "risklaba:friend:username"
  const qrData = `risklaba:friend:${username}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <Animated.View entering={FadeIn} style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Pressable style={styles.backdrop} onPress={handleClose}>
            <Animated.View entering={SlideInDown} style={styles.content}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <LinearGradient
                  colors={[
                    'rgba(10, 5, 0, 0.98)',
                    'rgba(26, 15, 0, 0.95)',
                    'rgba(10, 5, 0, 0.98)',
                  ]}
                  style={styles.panel}
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <View style={styles.headerLeft}>
                      <View style={styles.qrIcon}>
                        <Ionicons name="qr-code" size={24} color="#FF6B35" />
                      </View>
                      <Text style={styles.headerTitle}>Connect with Friends</Text>
                    </View>
                    <Pressable onPress={handleClose} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                  </View>

                  {/* QR Code Container */}
                  <View style={styles.qrContainer}>
                    <View style={styles.qrWrapper}>
                      <QRCodePlaceholder size={QR_SIZE - 40} />
                    </View>
                    <View style={styles.qrBorder} />
                  </View>

                  {/* Instructions */}
                  <View style={styles.instructions}>
                    <Text style={styles.instructionsText}>
                      Share this QR code with friends to connect
                    </Text>
                    <Text style={styles.usernameText}>@{username}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  safeArea: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
  },
  panel: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  qrIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    position: 'relative',
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  qrBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    pointerEvents: 'none',
  },
  instructions: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  instructionsText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  usernameText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FF6B35',
  },
});

