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
    };
  }, []);

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:startRecording',message:'Starting recording function',data:{platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-start',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    // Use Web Speech API on web, fallback to audio recording on native
    if (Platform.OS === 'web') {
      const recognition = getSpeechRecognition();
      if (recognition) {
        try {
          recognition.continuous = false;
          recognition.interimResults = true; // Enable to see interim results
          recognition.lang = 'en-US';
          
          transcriptRef.current = ''; // Reset transcript
          
          recognition.onstart = () => {
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:startRecording',message:'Permission requested',data:{granted:permission.granted,status:permission.status},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-start',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:startRecording',message:'Recording created successfully',data:{hasRecording:!!newRecording},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-start',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:startRecording',message:'Recording start error',data:{error:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-start',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:stopRecording',message:'Stop recording called',data:{hasRecording:!!recording,platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-stop',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:stopRecording',message:'Stopping recording',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-stop',hypothesisId:'G'})}).catch(()=>{});
      // #endregion

      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:stopRecording',message:'Recording stopped, got URI',data:{uri:uri?.substring(0,100)||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-stop',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      
      if (!uri) {
        throw new Error('Recording URI is null');
      }
      
      // Process the voice query (native platforms still use audio)
      await processVoiceQuery(uri);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:stopRecording',message:'Stop recording error',data:{error:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'recording-stop',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
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

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: response.responseText,
      });

      // Play audio response
      if (response.audioBase64) {
        await playAudioResponse(response.audioBase64);
      }
    } catch (error: any) {
      console.error('Voice query error:', error);
      let errorMessage = error?.message || 'Unknown error';
      addMessage({
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process voice query with audio (for native platforms)
  const processVoiceQuery = async (audioUri: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:processVoiceQuery',message:'Starting voice query processing',data:{audioUri,hasScreenshot:!!screenshotUri,platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:processVoiceQuery',message:'Reading audio file',data:{audioUri,platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Convert audio to base64 (web-compatible)
      const audioBase64 = await readFileAsBase64(audioUri);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:processVoiceQuery',message:'Audio converted to base64',data:{audioBase64Length:audioBase64?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:processVoiceQuery',message:'Sending to backend',data:{audioBase64Length:audioBase64?.length,screenshotBase64Length:screenshotBase64?.length,currentPage,userId:userId,userIdToSend},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const response = await AssistantService.voiceQuery(
        {
          screenshotBase64,
          audioBase64,
          page: currentPage,
        },
        userIdToSend
      );

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:processVoiceQuery',message:'Backend response received',data:{hasTranscript:!!response.transcript,hasResponseText:!!response.responseText,hasAudio:!!response.audioBase64},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Add user message (transcript)
      addMessage({
        role: 'user',
        content: `🎤 ${response.transcript}`,
      });

      // Add assistant response (text)
      addMessage({
        role: 'assistant',
        content: response.responseText,
      });

      // Play audio response
      await playAudioResponse(response.audioBase64);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssistantOverlay.tsx:processVoiceQuery',message:'Voice query error',data:{error:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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
        audioUri = `${FileSystem.cacheDirectory}voice_response_${Date.now()}.mp3`;
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

      // Clean up when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
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
        await sound.unloadAsync();
      } catch (error) {
        console.error('Error unloading sound on close:', error);
      }
      setSound(null);
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
                  {!isRecording ? (
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
