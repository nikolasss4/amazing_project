import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { theme } from '@app/theme';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width - 120, 280);

/**
 * QR Code Modal
 * 
 * Displays user's QR code for friend addition.
 * QR code contains: "risklaba:friend:{userId}"
 */
export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  userId,
  username,
}) => {
  const handleClose = () => {
    // Safe haptic call - no-op on web
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Silently fail if haptics are not available
      }
    }
    onClose();
  };

  // QR code data - URL for community registration form
  const qrData = 'https://docs.google.com/forms/d/e/1FAIpQLSc6MTr5ECPEKmIsQH161e6fD7-2daB6MD89a33MrVTy8itgMQ/viewform?usp=publish-editor';

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
                      <Text style={styles.headerTitle}>Add Friends</Text>
                    </View>
                    <Pressable onPress={handleClose} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                  </View>

                  {/* QR Code Container */}
                  <View style={styles.qrContainer}>
                    <View style={styles.qrWrapper}>
                      <QRCode
                        value={qrData}
                        size={QR_SIZE - 40}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                        quietZone={10}
                      />
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
    borderWidth: 0,
    borderColor: 'transparent',
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
  webFallback: {
    width: QR_SIZE - 40,
    height: QR_SIZE - 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
  },
  webFallbackText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: 'rgba(0, 0, 0, 0.7)',
    textAlign: 'center',
  },
  webFallbackId: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'monospace',
  },
});
