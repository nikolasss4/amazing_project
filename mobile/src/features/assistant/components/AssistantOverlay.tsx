import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';
import { useAssistantStore } from '@app/store';
import { AssistantService } from '../services/AssistantService';

interface AssistantOverlayProps {
  screenRef?: React.RefObject<View>;
}

export const AssistantOverlay: React.FC<AssistantOverlayProps> = ({ screenRef }) => {
  const { isOpen, messages, screenshotUri, setIsOpen, addMessage, setScreenshot, clearChat } =
    useAssistantStore();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isOpen && screenRef?.current && !screenshotUri) {
      captureScreenshot();
    }
  }, [isOpen]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const captureScreenshot = async () => {
    if (!screenRef?.current) return;

    try {
      const uri = await captureRef(screenRef, {
        format: 'png',
        quality: 0.8,
      });
      setScreenshot(uri);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    // Safe haptic call - no-op on web
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Silently fail if haptics are not available
      }
    }

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    });

    setIsLoading(true);

    try {
      // Send to AI service
      const response = await AssistantService.query({
        message: userMessage,
        screenshot: screenshotUri || undefined,
      });

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: response.message,
      });
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Safe haptic call - no-op on web
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Silently fail if haptics are not available
      }
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    // Safe haptic call - no-op on web
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Silently fail if haptics are not available
      }
    }
    clearChat();
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent onRequestClose={handleClose}>
      <Animated.View entering={FadeIn} style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <Animated.View entering={SlideInDown} style={styles.content}>
              <GlassPanel style={styles.panel}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <View style={styles.aiIcon}>
                      <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
                    </View>
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                  </View>
                  <View style={styles.headerRight}>
                    {messages.length > 0 && (
                      <Pressable onPress={handleClear} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
                      </Pressable>
                    )}
                    <Pressable onPress={handleClose} style={styles.iconButton}>
                      <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                  </View>
                </View>

                {/* Screenshot preview */}
                {screenshotUri && showScreenshot && (
                  <View style={styles.screenshotContainer}>
                    <Image source={{ uri: screenshotUri }} style={styles.screenshot} />
                    <Pressable
                      onPress={() => setShowScreenshot(false)}
                      style={styles.screenshotClose}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.textPrimary} />
                    </Pressable>
                  </View>
                )}

                {/* Messages */}
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesContainer}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textTertiary} />
                      <Text style={styles.emptyStateText}>
                        Ask me anything about the app or trading!
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        I can see your current screen and provide contextual help.
                      </Text>
                    </View>
                  ) : (
                    messages.map((message) => (
                      <View
                        key={message.id}
                        style={[
                          styles.messageBubble,
                          message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            message.role === 'user' ? styles.userText : styles.assistantText,
                          ]}
                        >
                          {message.content}
                        </Text>
                      </View>
                    ))
                  )}
                  {isLoading && (
                    <View style={[styles.messageBubble, styles.assistantBubble]}>
                      <ActivityIndicator color={theme.colors.accent} />
                    </View>
                  )}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder="Type your question..."
                      placeholderTextColor={theme.colors.textTertiary}
                      multiline
                      maxLength={500}
                      editable={!isLoading}
                    />
                    <Pressable
                      onPress={handleSend}
                      disabled={!inputText.trim() || isLoading}
                      style={[
                        styles.sendButton,
                        (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                      ]}
                    >
                      <Ionicons
                        name="send"
                        size={20}
                        color={
                          !inputText.trim() || isLoading
                            ? theme.colors.textTertiary
                            : theme.colors.accent
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              </GlassPanel>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    margin: theme.spacing.lg,
  },
  panel: {
    flex: 1,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
  },
  iconButton: {
    padding: theme.spacing.sm,
  },
  screenshotContainer: {
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  screenshot: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  screenshotClose: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.pill,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accent,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  messageText: {
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.normal,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: theme.colors.textPrimary,
  },
  inputContainer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textPrimary,
    maxHeight: 100,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
