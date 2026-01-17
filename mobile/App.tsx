import React, { useRef } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { AssistantOverlay } from './src/features/assistant/components/AssistantOverlay';

export default function App() {
  const appContainerRef = useRef<View>(null);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View ref={appContainerRef} style={styles.container} collapsable={false}>
        <RootNavigator />
      </View>
      <AssistantOverlay screenRef={appContainerRef} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
