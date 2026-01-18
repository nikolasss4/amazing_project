/**
 * Wallet Connection Modal
 * Allows users to connect their wallet or view wallet status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';
import { useWalletStore } from '@app/store';
import WalletService from '../services/WalletService';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

// Progress Step Component for authentication flow
interface ProgressStepProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

const ProgressStep: React.FC<ProgressStepProps> = ({ label, isActive, isComplete }) => (
  <View style={progressStyles.step}>
    <View style={[
      progressStyles.dot,
      isActive && progressStyles.dotActive,
      isComplete && progressStyles.dotComplete,
    ]}>
      {isComplete && (
        <Ionicons name="checkmark" size={10} color="#FFF" />
      )}
      {isActive && !isComplete && (
        <View style={progressStyles.dotPulse} />
      )}
    </View>
    <Text style={[
      progressStyles.label,
      isActive && progressStyles.labelActive,
      isComplete && progressStyles.labelComplete,
    ]}>
      {label}
    </Text>
  </View>
);

const progressStyles = StyleSheet.create({
  step: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  dotComplete: {
    backgroundColor: theme.colors.success,
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  labelComplete: {
    color: theme.colors.success,
  },
});

// Map auth steps to user-friendly messages
const AUTH_STEP_MESSAGES: Record<string, string> = {
  'idle': 'Connect Wallet',
  'getting_message': 'Preparing authentication...',
  'signing': 'Waiting for signature...',
  'authenticating': 'Authenticating...',
  'setting_up_wallet': 'Setting up wallet...',
  'complete': 'Connected!',
};

export const WalletModal: React.FC<WalletModalProps> = ({ visible, onClose }) => {
  const { isConnected, walletAddress, isConnecting, authStep, error, agentWallet, connect, disconnect } = useWalletStore();
  const [inputAddress, setInputAddress] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Get the current step message for display
  const currentStepMessage = AUTH_STEP_MESSAGES[authStep] || 'Connecting...';
  
  // Check if agent wallet needs approval
  const needsAgentWalletApproval = agentWallet?.needsApproval === true;

  const handleConnect = async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🔘 WALLET CONNECT BUTTON PRESSED');
    console.log('='.repeat(80));
    console.log('📝 Input address:', inputAddress);
    console.log('🌐 Current platform:', Platform.OS);
    
    setLocalError(null);

    // Validate address
    if (!WalletService.isValidAddress(inputAddress)) {
      console.log('❌ Invalid address format');
      setLocalError('Invalid wallet address. Please enter a valid Ethereum address.');
      return;
    }

    console.log('✅ Address validation passed');
    console.log('🔌 Calling store.connect()...');

    try {
      await connect(inputAddress);
      console.log('✅ store.connect() completed successfully!');
      setInputAddress('');
      onClose();
    } catch (error: any) {
      console.error('❌ store.connect() failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      setLocalError(error.message || 'Failed to connect wallet');
    }
    console.log('='.repeat(80) + '\n');
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      onClose();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handlePasteAddress = async () => {
    // In React Native, you would use Clipboard API
    // For now, just a placeholder
    // import Clipboard from '@react-native-clipboard/clipboard';
    // const text = await Clipboard.getString();
    // setInputAddress(text);
    console.log('Paste address');
  };

  const displayError = error || localError;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={FadeIn} exiting={FadeOut} style={{ width: '100%', maxWidth: 500, zIndex: 1 }}>
          <GlassPanel style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            {isConnected ? (
              // Connected State
              <View style={styles.content}>
                <View style={styles.connectedBadge}>
                  <Ionicons 
                    name={needsAgentWalletApproval ? "alert-circle" : "checkmark-circle"} 
                    size={48} 
                    color={needsAgentWalletApproval ? theme.colors.warning : theme.colors.success} 
                  />
                </View>

                <Text style={styles.connectedLabel}>Connected Address</Text>
                <View style={styles.addressBox}>
                  <Text style={styles.addressText}>
                    {WalletService.formatAddress(walletAddress || '')}
                  </Text>
                  <Pressable style={styles.copyButton} onPress={() => console.log('Copy')}>
                    <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                  </Pressable>
                </View>

                {/* Agent Wallet Status */}
                {needsAgentWalletApproval ? (
                  <View style={styles.agentWalletWarning}>
                    <View style={styles.agentWalletHeader}>
                      <Ionicons name="key-outline" size={24} color={theme.colors.warning} />
                      <Text style={styles.agentWalletTitle}>Agent Wallet Approval Required</Text>
                    </View>
                    <Text style={styles.agentWalletDescription}>
                      To enable trading through Pear Protocol, you need to approve the agent wallet on Hyperliquid.
                    </Text>
                    
                    {agentWallet?.address && (
                      <View style={styles.agentAddressBox}>
                        <Text style={styles.agentAddressLabel}>Agent Wallet Address:</Text>
                        <Text style={styles.agentAddressText} selectable>
                          {agentWallet.address}
                        </Text>
                      </View>
                    )}
                    
                    {agentWallet?.approvalInstructions && (
                      <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsTitle}>How to approve:</Text>
                        <Text style={styles.instructionStep}>1. {agentWallet.approvalInstructions.step1}</Text>
                        <Text style={styles.instructionStep}>2. {agentWallet.approvalInstructions.step2}</Text>
                        <Text style={styles.instructionStep}>3. {agentWallet.approvalInstructions.step3}</Text>
                        <Text style={styles.instructionStep}>4. {agentWallet.approvalInstructions.step4}</Text>
                        <Text style={styles.instructionNote}>{agentWallet.approvalInstructions.note}</Text>
                      </View>
                    )}
                    
                    <Pressable 
                      style={styles.hyperliquidButton}
                      onPress={() => {
                        // Open Hyperliquid in browser
                        console.log('Opening Hyperliquid...');
                        // Linking.openURL('https://app.hyperliquid.xyz');
                      }}
                    >
                      <Ionicons name="open-outline" size={18} color="#FFF" />
                      <Text style={styles.hyperliquidButtonText}>Open Hyperliquid</Text>
                    </Pressable>
                  </View>
                ) : agentWallet?.status === 'ACTIVE' ? (
                  <View style={styles.infoBox}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    <Text style={styles.successText}>
                      Agent wallet is active and ready for trading!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.colors.info} />
                    <Text style={styles.infoText}>
                      Your wallet is connected and ready to trade on Pear Protocol
                    </Text>
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <Button
                    variant="error"
                    onPress={handleDisconnect}
                    fullWidth
                    size="lg"
                  >
                    <View style={styles.buttonContent} pointerEvents="none">
                      <Ionicons name="log-out-outline" size={20} color="#FFF" />
                      <Text style={styles.buttonText}>Disconnect Wallet</Text>
                    </View>
                  </Button>
                </View>
              </View>
            ) : (
              // Disconnected State
              <View style={styles.content}>
                <View style={styles.iconContainer}>
                  <Ionicons name="wallet-outline" size={64} color={theme.colors.primary} />
                </View>

                <Text style={styles.description}>
                  Enter your Ethereum wallet address to start trading
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Wallet Address</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={inputAddress}
                      onChangeText={(text) => {
                        setInputAddress(text);
                        setLocalError(null);
                      }}
                      placeholder="0x..."
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isConnecting}
                    />
                    {inputAddress.length === 0 && (
                      <Pressable
                        style={styles.pasteButton}
                        onPress={handlePasteAddress}
                      >
                        <Ionicons name="clipboard-outline" size={20} color={theme.colors.primary} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.inputHint}>
                    Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
                  </Text>
                </View>

                {displayError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                    <Text style={styles.errorText}>{displayError}</Text>
                  </View>
                )}

                <View style={styles.warningBox}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.warning} />
                  <Text style={styles.warningText}>
                    Your wallet will be used to authenticate with Pear Protocol. We'll never ask for your private keys.
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <Button
                    variant="primary"
                    onPress={handleConnect}
                    fullWidth
                    size="lg"
                    disabled={!inputAddress || isConnecting}
                    loading={isConnecting}
                    loadingText={currentStepMessage}
                  >
                    <View style={styles.buttonContent} pointerEvents="none">
                      <Ionicons name="wallet" size={20} color="#FFF" />
                      <Text style={styles.buttonText}>Connect Wallet</Text>
                    </View>
                  </Button>
                </View>
                
                {/* Authentication Progress Indicator */}
                {isConnecting && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressSteps}>
                      <ProgressStep 
                        label="Get Message" 
                        isActive={authStep === 'getting_message'} 
                        isComplete={['signing', 'authenticating', 'setting_up_wallet', 'complete'].includes(authStep)}
                      />
                      <ProgressStep 
                        label="Sign" 
                        isActive={authStep === 'signing'} 
                        isComplete={['authenticating', 'setting_up_wallet', 'complete'].includes(authStep)}
                      />
                      <ProgressStep 
                        label="Authenticate" 
                        isActive={authStep === 'authenticating'} 
                        isComplete={['setting_up_wallet', 'complete'].includes(authStep)}
                      />
                      <ProgressStep 
                        label="Setup" 
                        isActive={authStep === 'setting_up_wallet'} 
                        isComplete={authStep === 'complete'}
                      />
                    </View>
                  </View>
                )}

                <Pressable style={styles.helpLink} onPress={() => console.log('Help')}>
                  <Ionicons name="help-circle-outline" size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.helpText}>Need help connecting?</Text>
                </Pressable>
              </View>
            )}
          </GlassPanel>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modal: {
    padding: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFFFFF',
  },
  content: {
    gap: theme.spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  connectedBadge: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  connectedLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    gap: theme.spacing.sm,
  },
  addressText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },
  copyButton: {
    padding: theme.spacing.xs,
  },
  description: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.md,
  },
  inputGroup: {
    gap: theme.spacing.sm,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
  },
  pasteButton: {
    padding: theme.spacing.md,
  },
  inputHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.error,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.borderRadius.md,
  },
  warningText: {
    flex: 1,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warning,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.xs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.info,
  },
  buttonContainer: {
    marginTop: theme.spacing.md,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  buttonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFFFFF',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  helpText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Agent Wallet Styles
  agentWalletWarning: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
    gap: theme.spacing.sm,
  },
  agentWalletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  agentWalletTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.warning,
  },
  agentWalletDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.sm,
  },
  agentAddressBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  agentAddressLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  agentAddressText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.warning,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  instructionsBox: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  instructionsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  instructionStep: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    paddingLeft: theme.spacing.sm,
  },
  instructionNote: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  hyperliquidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  hyperliquidButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: '#FFF',
  },
  successText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.success,
  },
});
