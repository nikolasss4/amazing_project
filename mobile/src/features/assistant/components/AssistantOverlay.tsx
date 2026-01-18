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
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Define cache directory for legacy compatibility
const getCacheDirectory = () => {
  // Access through the new API if available, fallback for compatibility
  try {
    // @ts-ignore - cacheDirectory may exist on some versions
    return FileSystem.cacheDirectory || `${FileSystem.Paths?.cache?.uri}/` || '';
  } catch {
    return '';
  }
};
import Markdown from 'react-native-markdown-display';
import { GlassPanel } from '@ui/primitives/GlassPanel';
import { Button } from '@ui/primitives/Button';
import { theme } from '@app/theme';
import { useAssistantStore, useUserStore } from '@app/store';
import { AssistantService } from '../services/AssistantService';

interface AssistantOverlayProps {
  screenRef?: React.RefObject<View>;
  currentPage?: string; // 'trade' | 'community' | 'improve'
}

export const AssistantOverlay: React.FC<AssistantOverlayProps> = ({ screenRef, currentPage = 'community' }) => {
  const { isOpen, messages, screenshotUri, setIsOpen, addMessage, setScreenshot, clearChat } =
    useAssistantStore();
  const { userId } = useUserStore();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null); // Web Speech API
  const transcriptRef = useRef<string>(''); // Store transcript from Web Speech API

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      // Stop audio if playing when component unmounts
      if (sound) {
        sound.stopAsync().catch(console.error);
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  // Web Speech API type declarations
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
    message: string;
  }

  const getSpeechRecognition = (): SpeechRecognition | null => {
    if (Platform.OS !== 'web') return null;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    return new SpeechRecognition() as SpeechRecognition;
  };

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

  const startRecording = async () => {

    // Use Web Speech API on web, fallback to audio recording on native
    if (Platform.OS === 'web') {
      const recognition = getSpeechRecognition();
      if (recognition) {
        try {
          recognition.continuous = false;
          recognition.interimResults = true; // Enable to see interim results
          recognition.lang = 'en-US';
          
          transcriptRef.current = ''; // Reset transcript
          
          (recognition as any).onstart = () => {
            console.log('Speech recognition started');
          };
          
          recognition.onresult = (event) => {
            console.log('Speech recognition result, results count:', event.results.length);
            
            // Accumulate all transcripts from all results
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              const result = event.results[i];
              const alt = result[0];
              if (alt?.transcript) {
                transcript += alt.transcript;
              }
              console.log(`Result ${i}: ${alt?.transcript} (isFinal: ${result.isFinal})`);
            }
            
            // Update transcript ref (always, not just when final)
            transcriptRef.current = transcript.trim();
            console.log('Current transcript:', transcriptRef.current);
          };
          
          recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error, event.message);
            setIsRecording(false);
            recognitionRef.current = null;
            
            let errorMsg = 'Speech recognition error: ';
            if (event.error === 'no-speech') {
              errorMsg = 'No speech detected. Please speak clearly and try again.';
            } else if (event.error === 'audio-capture') {
              errorMsg = 'Microphone not found or access denied. Please check your microphone permissions.';
            } else if (event.error === 'not-allowed') {
              errorMsg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
            } else {
              errorMsg += `${event.message || event.error}. Please try again.`;
            }
            
            addMessage({
              role: 'assistant',
              content: errorMsg,
            });
          };
          
          recognition.onend = async () => {
            console.log('Speech recognition ended. Final transcript:', transcriptRef.current);
            setIsRecording(false);
            recognitionRef.current = null;
            
            const finalTranscript = transcriptRef.current.trim();
            if (finalTranscript) {
              console.log('Processing transcript:', finalTranscript);
              await processVoiceQueryWithTranscript(finalTranscript);
            } else {
              console.log('No transcript captured');
              addMessage({
                role: 'assistant',
                content: 'No speech detected. Please try speaking again.',
              });
            }
          };
          
          recognitionRef.current = recognition;
          setIsRecording(true);
          recognition.start();
          
          // Auto-stop after 30 seconds
          recordingTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }, 30000);
          
          return;
        } catch (error: any) {
          console.error('Failed to start speech recognition:', error);
          addMessage({
            role: 'assistant',
            content: 'Speech recognition is not available. Please use text input instead.',
          });
          return;
        }
      }
    }

    // Fallback: Audio recording for native platforms
    try {
      console.log('Starting recording...');
      
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      console.log('Permission status:', permission);

      if (!permission.granted) {
        addMessage({
          role: 'assistant',
          content: 'Microphone permission is required to record voice. Please enable it in your device settings.',
        });
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Audio mode set, creating recording...');

      // Create and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      console.log('Recording created:', newRecording);

      setRecording(newRecording);
      setIsRecording(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Auto-stop after 30 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      const errorMessage = error?.message || 'Unknown error';
      addMessage({
        role: 'assistant',
        content: `Failed to start recording: ${errorMessage}. Please try again or use the text input.`,
      });
      setIsRecording(false);
      setRecording(null);
    }
  };

  const stopRecording = async () => {

    // Stop Web Speech API on web
    if (Platform.OS === 'web' && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      return;
    }

    // Stop audio recording on native
    if (!recording) return;

    const currentRecording = recording;
    setIsRecording(false);
    setRecording(null);
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    try {

      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      
      
      if (!uri) {
        throw new Error('Recording URI is null');
      }
      
      // Process the voice query (native platforms still use audio)
      await processVoiceQuery(uri);
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing the recording. Please try again.',
      });
    }
  };

  // Helper function to read file as base64 (web-compatible)
  const readFileAsBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      // Web: Use Fetch API
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix if present
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Native: Use FileSystem
      return await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
    }
  };

  // Process voice query with transcript (from Web Speech API)
  const processVoiceQueryWithTranscript = async (transcript: string) => {
    if (!screenshotUri) {
      await captureScreenshot();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsProcessing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Convert screenshot to base64 if it's a file URI
      let screenshotBase64 = '';
      if (screenshotUri) {
        if (screenshotUri.startsWith('data:')) {
          screenshotBase64 = screenshotUri.split(',')[1] || screenshotUri;
        } else {
          screenshotBase64 = await readFileAsBase64(screenshotUri);
        }
      }

      // Send to backend with transcript (no audio needed)
      const userIdToSend = userId || 'demo-user-001';
      
      const response = await AssistantService.voiceQuery(
        {
          screenshotBase64,
          transcript, // Send transcript instead of audio
          page: currentPage,
        },
        userIdToSend
      );

      // Add user message (transcript)
      addMessage({
        role: 'user',
        content: `🎤 ${transcript}`,
      });

      // Format and add assistant response
      const formattedResponse = response.responseText
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .trim();
      
      addMessage({
        role: 'assistant',
        content: formattedResponse,
      });

      // Play audio response (use browser TTS as fallback if no audio)
      // Always try to speak the response
      if (response.audioBase64) {
        await playAudioResponse(response.audioBase64);
      } else if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Fallback to browser's built-in text-to-speech
        // Stop any ongoing speech first
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(formattedResponse);
        utterance.rate = 0.9; // Slightly slower for better clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        // Track browser TTS state
        setIsPlayingAudio(true);
        
        // Ensure speech is triggered
        utterance.onerror = (e) => {
          console.error('Speech synthesis error:', e);
          setIsPlayingAudio(false);
        };
        
        utterance.onend = () => {
          setIsPlayingAudio(false);
        };
        
        window.speechSynthesis.speak(utterance);
        console.log('Browser TTS started for:', formattedResponse.substring(0, 50));
      }
    } catch (error: any) {
      console.error('Voice query error:', error);
      let errorMessage = error?.message || 'Unknown error';
      addMessage({
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
      });
      setIsPlayingAudio(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process voice query with audio (for native platforms)
  const processVoiceQuery = async (audioUri: string) => {

    if (!screenshotUri) {
      await captureScreenshot();
      // Wait a moment for screenshot to be captured
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsProcessing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {

      // Convert audio to base64 (web-compatible)
      const audioBase64 = await readFileAsBase64(audioUri);


      // Convert screenshot to base64 if it's a file URI
      let screenshotBase64 = '';
      if (screenshotUri) {
        if (screenshotUri.startsWith('data:')) {
          // Already base64
          screenshotBase64 = screenshotUri.split(',')[1] || screenshotUri;
        } else {
          // File URI, convert to base64 (web-compatible)
          screenshotBase64 = await readFileAsBase64(screenshotUri);
        }
      }

      // Send to backend (always provide userId, use fallback if not set)
      const userIdToSend = userId || 'demo-user-001';
      

      const response = await AssistantService.voiceQuery(
        {
          screenshotBase64,
          audioBase64,
          page: currentPage,
        },
        userIdToSend
      );


      // Add user message (transcript)
      addMessage({
        role: 'user',
        content: `🎤 ${response.transcript}`,
      });

      // Format and add assistant response (text)
      const formattedResponse = response.responseText
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .trim();
      
      addMessage({
        role: 'assistant',
        content: formattedResponse,
      });

      // Play audio response (use browser TTS as fallback if no audio)
      // Always try to speak the response
      if (response.audioBase64) {
        await playAudioResponse(response.audioBase64);
      } else if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Fallback to browser's built-in text-to-speech
        // Stop any ongoing speech first
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(formattedResponse);
        utterance.rate = 0.9; // Slightly slower for better clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        // Track browser TTS state
        setIsPlayingAudio(true);
        
        // Ensure speech is triggered
        utterance.onerror = (e) => {
          console.error('Speech synthesis error:', e);
          setIsPlayingAudio(false);
        };
        
        utterance.onend = () => {
          setIsPlayingAudio(false);
        };
        
        window.speechSynthesis.speak(utterance);
        console.log('Browser TTS started for:', formattedResponse.substring(0, 50));
      }
    } catch (error: any) {
      console.error('Voice query error:', error);
      let errorMessage = error?.message || 'Unknown error';
      
      // Provide helpful error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Cannot connect to the backend server. Please make sure the backend is running on http://127.0.0.1:3000';
      }
      
      addMessage({
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
      });
      setIsPlayingAudio(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = async (audioBase64: string) => {
    try {
      let audioUri: string;
      
      if (Platform.OS === 'web') {
        // Web: Convert base64 to data URL
        audioUri = `data:audio/mpeg;base64,${audioBase64}`;
      } else {
        // Native: Write to file system
        audioUri = `${getCacheDirectory()}voice_response_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(audioUri, audioBase64, {
          encoding: 'base64',
        });
      }

      // Play audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlayingAudio(true);

      // Clean up when finished
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          // Only stop when audio actually finishes, not when it's paused/stopped manually
          if (status.didJustFinish) {
            newSound.unloadAsync().catch(console.error);
            setSound(null);
            setIsPlayingAudio(false);
          }
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlayingAudio(false);
      setSound(null);
    }
  };

  const stopAudio = async () => {
    // Stop Audio.Sound if playing
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlayingAudio(false);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (error) {
        console.error('Error stopping audio:', error);
        setSound(null);
        setIsPlayingAudio(false);
      }
    }
    
    // Stop browser TTS if playing (web fallback)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleClose = async () => {
    // Stop recording if active
    if (isRecording && recording) {
      setIsRecording(false);
      const currentRecording = recording;
      setRecording(null);
      try {
        await currentRecording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error stopping recording on close:', error);
      }
    }
    // Stop audio if playing
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.error('Error unloading sound on close:', error);
      }
      setSound(null);
      setIsPlayingAudio(false);
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    clearChat();
  };

  return (
    <Modal visible={isOpen} animationType="none" transparent onRequestClose={handleClose}>
      <View style={styles.modalBackground}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalOverlay}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.container}
            >
              <Animated.View entering={SlideInDown.duration(300).delay(50)} style={styles.content}>
                <View style={styles.panelSolid}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <View style={styles.aiIcon}>
                      <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
                    </View>
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                  </View>
                  <View style={styles.headerRight}>
                    {isPlayingAudio && (
                      <Pressable onPress={stopAudio} style={styles.iconButton}>
                        <Ionicons name="stop-circle" size={24} color="#FF4444" />
                      </Pressable>
                    )}
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
                        {message.role === 'user' ? (
                          <Text
                            style={[
                              styles.messageText,
                              styles.userText,
                            ]}
                          >
                            {message.content}
                          </Text>
                        ) : (
                          <Markdown
                            style={{
                              body: {
                                color: theme.colors.textPrimary,
                                fontSize: theme.typography.sizes.md,
                                lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.normal,
                              },
                              paragraph: {
                                marginTop: 0,
                                marginBottom: theme.spacing.sm,
                              },
                              heading1: {
                                fontSize: theme.typography.sizes.xl,
                                fontWeight: theme.typography.weights.bold,
                                color: theme.colors.textPrimary,
                                marginTop: theme.spacing.md,
                                marginBottom: theme.spacing.sm,
                              },
                              heading2: {
                                fontSize: theme.typography.sizes.lg,
                                fontWeight: theme.typography.weights.bold,
                                color: theme.colors.textPrimary,
                                marginTop: theme.spacing.md,
                                marginBottom: theme.spacing.sm,
                              },
                              heading3: {
                                fontSize: theme.typography.sizes.md,
                                fontWeight: theme.typography.weights.semibold,
                                color: theme.colors.textPrimary,
                                marginTop: theme.spacing.sm,
                                marginBottom: theme.spacing.xs,
                              },
                              strong: {
                                fontWeight: theme.typography.weights.bold,
                                color: theme.colors.textPrimary,
                              },
                              em: {
                                fontStyle: 'italic',
                                color: theme.colors.textPrimary,
                              },
                              list_item: {
                                marginBottom: theme.spacing.xs,
                                flexDirection: 'row',
                              },
                              bullet_list: {
                                marginBottom: theme.spacing.sm,
                              },
                              ordered_list: {
                                marginBottom: theme.spacing.sm,
                              },
                              bullet_list_icon: {
                                color: theme.colors.accent,
                                marginRight: theme.spacing.sm,
                              },
                              code_inline: {
                                backgroundColor: theme.colors.backgroundElevated,
                                color: theme.colors.accent,
                                paddingHorizontal: theme.spacing.xs,
                                paddingVertical: 2,
                                borderRadius: 4,
                                fontFamily: 'monospace',
                                fontSize: theme.typography.sizes.sm,
                              },
                              code_block: {
                                backgroundColor: theme.colors.backgroundElevated,
                                color: theme.colors.textPrimary,
                                padding: theme.spacing.md,
                                borderRadius: theme.borderRadius.md,
                                marginVertical: theme.spacing.sm,
                                fontFamily: 'monospace',
                                fontSize: theme.typography.sizes.sm,
                              },
                              link: {
                                color: theme.colors.accent,
                                textDecorationLine: 'underline',
                              },
                              blockquote: {
                                borderLeftWidth: 3,
                                borderLeftColor: theme.colors.accent,
                                paddingLeft: theme.spacing.md,
                                marginVertical: theme.spacing.sm,
                                backgroundColor: theme.colors.backgroundElevated,
                                padding: theme.spacing.md,
                                borderRadius: theme.borderRadius.sm,
                              },
            }}
                          >
                            {message.content}
                          </Markdown>
                        )}
                      </View>
                    ))
                  )}
                  {(isLoading || isProcessing) && (
                    <View style={[styles.messageBubble, styles.assistantBubble]}>
                      <ActivityIndicator color={theme.colors.accent} />
                      <Text style={[styles.messageText, styles.assistantText, { marginTop: 8 }]}>
                        {isProcessing ? 'Analyzing your voice...' : 'Thinking...'}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Voice Recording Button */}
                <View style={styles.voiceContainer}>
                  {isPlayingAudio ? (
                    <Pressable onPress={stopAudio} style={styles.voiceButtonStop}>
                      <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
                      <Text style={styles.voiceButtonTextStop}>Stop talking</Text>
                    </Pressable>
                  ) : !isRecording ? (
                    <Pressable
                      onPress={startRecording}
                      disabled={isProcessing || isLoading}
                      style={[styles.voiceButton, (isProcessing || isLoading) && styles.voiceButtonDisabled]}
                    >
                      <Ionicons name="mic" size={24} color={theme.colors.accent} />
                      <Text style={styles.voiceButtonText}>Tap to speak</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={stopRecording} style={styles.voiceButtonRecording}>
                      <View style={styles.recordingIndicator} />
                      <Ionicons name="stop" size={24} color="#FF4444" />
                      <Text style={styles.voiceButtonTextRecording}>Listening... Tap to stop</Text>
                    </Pressable>
                  )}
                </View>

                {/* Input (alternative text input) */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder="Or type your question..."
                      placeholderTextColor={theme.colors.textTertiary}
                      multiline
                      maxLength={500}
                      editable={!isLoading && !isProcessing && !isRecording}
                    />
                    <Pressable
                      onPress={handleSend}
                      disabled={!inputText.trim() || isLoading || isProcessing || isRecording}
                      style={[
                        styles.sendButton,
                        (!inputText.trim() || isLoading || isProcessing || isRecording) && styles.sendButtonDisabled,
                      ]}
                    >
                      <Ionicons
                        name="send"
                        size={20}
                        color={
                          !inputText.trim() || isLoading || isProcessing || isRecording
                            ? theme.colors.textTertiary
                            : theme.colors.accent
                        }
                      />
                    </Pressable>
                  </View>
                </View>
                </View>
              </Animated.View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: '#000000', // Solid black background to prevent see-through
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 14, 0.98)', // Nearly opaque dark overlay
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
  panelSolid: {
    flex: 1,
    padding: 0,
    backgroundColor: 'rgba(20, 20, 28, 1)', // Solid dark background
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    overflow: 'hidden',
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
  voiceContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accentMuted,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  voiceButtonRecording: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
  },
  voiceButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.accent,
  },
  voiceButtonTextRecording: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: '#FF4444',
  },
  voiceButtonStop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#FF4444',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FF6666',
  },
  voiceButtonTextStop: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: '#FFFFFF',
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
