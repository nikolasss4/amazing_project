import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '@app/theme';

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
}

// Extend Window interface for TradingView
declare global {
  interface Window {
    TradingView?: any;
  }
}

/**
 * TradingViewChart - Embeds TradingView widget via WebView (mobile) or direct DOM (web)
 * Interval options: 1, 5, 15, 60, 240, D, W, M
 */
export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  interval = 'D',
}) => {
  const containerIdRef = useRef(`tradingview_${Math.random().toString(36).substr(2, 9)}`);
  const widgetInitializedRef = useRef(false);
  const viewRef = useRef<View>(null);

  // Web-specific implementation using direct DOM manipulation
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const containerId = containerIdRef.current;
      
      // Get the actual DOM element from the View ref
      const getDOMElement = () => {
        if (viewRef.current) {
          // @ts-ignore - accessing internal React Native Web node
          const node = viewRef.current._nativeNode || viewRef.current;
          if (node && node.setAttribute) {
            node.setAttribute('id', containerId);
            return node;
          }
          // Try alternative access methods
          if (node && node.nodeType === 1) {
            return node;
          }
        }
        // Fallback: try to find by ID
        return document.getElementById(containerId);
      };

      const container = getDOMElement();
      
      if (container) {
        // Reset initialization flag when symbol/interval changes
        widgetInitializedRef.current = false;
        
        // Clear container
        container.innerHTML = '';
        
        // Create widget div
        const widgetDiv = document.createElement('div');
        const widgetId = `tradingview_widget_${containerId}`;
        widgetDiv.id = widgetId;
        widgetDiv.style.width = '100%';
        widgetDiv.style.height = '100%';
        widgetDiv.style.minHeight = '300px';
        container.appendChild(widgetDiv);
        
        // Load TradingView script if not already loaded
        const loadScript = () => {
          if (window.TradingView) {
            initializeWidget(widgetId);
          } else {
            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
            if (existingScript) {
              existingScript.addEventListener('load', () => {
                if (window.TradingView) {
                  initializeWidget(widgetId);
                }
              });
            } else {
              const script = document.createElement('script');
              script.src = 'https://s3.tradingview.com/tv.js';
              script.async = true;
              script.onload = () => {
                if (window.TradingView) {
                  initializeWidget(widgetId);
                }
              };
              script.onerror = () => {
                console.error('Failed to load TradingView script');
              };
              document.head.appendChild(script);
            }
          }
        };

        const initializeWidget = (widgetContainerId: string) => {
          if (widgetInitializedRef.current) return;
          
          try {
            new window.TradingView.widget({
              width: '100%',
              height: '100%',
              symbol: symbol,
              interval: interval,
              timezone: 'Etc/UTC',
              theme: 'dark',
              style: '1',
              locale: 'en',
              toolbar_bg: '#000000',
              enable_publishing: false,
              hide_top_toolbar: false,
              hide_legend: true,
              save_image: false,
              container_id: widgetContainerId,
              backgroundColor: 'rgba(0, 0, 0, 0)',
              gridColor: 'rgba(255, 255, 255, 0.06)',
              hide_side_toolbar: true,
            });
            widgetInitializedRef.current = true;
          } catch (error) {
            console.error('TradingView widget initialization error:', error);
          }
        };

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          loadScript();
        }, 100);
      }
    }
  }, [symbol, interval]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body { margin: 0; padding: 0; background: transparent; }
          #tradingview_widget { height: 100vh; width: 100%; }
        </style>
      </head>
      <body>
        <div id="tradingview_widget"></div>
        <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
        <script type="text/javascript">
          new TradingView.widget({
            "width": "100%",
            "height": "100%",
            "symbol": "${symbol}",
            "interval": "${interval}",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#000000",
            "enable_publishing": false,
            "hide_top_toolbar": false,
            "hide_legend": true,
            "save_image": false,
            "container_id": "tradingview_widget",
            "backgroundColor": "rgba(0, 0, 0, 0)",
            "gridColor": "rgba(255, 255, 255, 0.06)",
            "hide_side_toolbar": true
          });
        </script>
      </body>
    </html>
  `;

  // Web platform: use direct DOM manipulation
  if (Platform.OS === 'web') {
    return (
      <View 
        ref={viewRef}
        style={styles.container}
        // @ts-ignore - web-specific prop for DOM access
        nativeID={containerIdRef.current}
      />
    );
  }

  // Mobile platforms: use WebView
  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    minHeight: 300,
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
