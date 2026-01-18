import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@app/theme';
import { CommunityService } from '../services/CommunityService';

// Conditional import for web compatibility
let Camera: any = null;
let CameraView: any = null;
try {
  if (Platform.OS !== 'web') {
    const cameraModule = require('expo-camera');
    Camera = cameraModule.Camera;
    CameraView = cameraModule.CameraView;
  }
} catch (e) {
  // Camera package not available on web
  console.log('Camera package not available on this platform');
}

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onFriendAdded: (friendId: string, username: string) => void;
}

/**
 * QR Scanner Modal
 * 
 * Scans QR codes to add friends.
 * Expects format: "risklaba:friend:{userId}"
 */
export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  userId,
  onFriendAdded,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
      setScanned(false);
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'web' || !Camera) {
      setHasPermission(false);
      Alert.alert(
        'Not Available on Web',
        'QR code scanning is only available on mobile devices. Please test on iOS or Android.'
      );
      return;
    }
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Validate QR code format
      if (!data.startsWith('risklaba:friend:')) {
        Alert.alert('Invalid QR Code', 'This is not a RiskLaba friend QR code.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      // Add friend via API
      const result = await CommunityService.addFriendViaQR(userId, data);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        'Friend Added!',
        `You are now friends with @${result.username}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onFriendAdded(result.friendId!, result.username!);
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', error.message || 'Failed to add friend');
      setScanned(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onClose();
    }
  };

  if (hasPermission === null) {
    return null;
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>Camera permission is required to scan QR codes</Text>
              <Pressable onPress={requestCameraPermission} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </Pressable>
              <Pressable onPress={handleClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Animated.View entering={FadeIn} style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scan Friend QR Code</Text>
            <Pressable onPress={handleClose} style={styles.closeButton} disabled={processing}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Camera View */}
          <View style={styles.cameraContainer}>
            {Platform.OS !== 'web' && CameraView ? (
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              >
                <View style={styles.overlay}>
                  <View style={styles.scanArea}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                  </View>
                </View>
              </CameraView>
            ) : (
              <View style={[styles.camera, styles.webCameraFallback]}>
                <Ionicons name="scan" size={80} color="#FF6B35" />
                <Text style={styles.webFallbackText}>
                  Camera scanning is only available{'\n'}on mobile devices
                </Text>
                <Text style={styles.webFallbackSubtext}>
                  Please test on iOS or Android
                </Text>
              </View>
            )}

            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text style={styles.processingText}>Adding friend...</Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Position the QR code within the frame
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  cameraContainer: {
    flex: 1,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FF6B35',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  processingText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  instructions: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  permissionText: {
    fontSize: theme.typography.sizes.lg,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  permissionButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  cancelButtonText: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  webCameraFallback: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  webFallbackText: {
    fontSize: theme.typography.sizes.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  webFallbackSubtext: {
    fontSize: theme.typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

