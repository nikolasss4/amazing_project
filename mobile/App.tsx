import React, { useRef } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { AssistantOverlay } from './src/features/assistant/components/AssistantOverlay';
import { BACKEND_BASE_URL } from './src/app/config';
import { AssetService } from './src/features/trade/services/AssetService';

// Configure backend URL immediately at module load (before any components render)
if (BACKEND_BASE_URL) {
  AssetService.setBackendUrl(BACKEND_BASE_URL);
}

export default function App() {
  const appContainerRef = useRef<View>(null);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View ref={appContainerRef} style={styles.container} collapsable={false}>
          <RootNavigator />
        </View>
        <AssistantOverlay screenRef={appContainerRef} />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
