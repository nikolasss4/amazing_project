import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '@app/theme';

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
}

/**
 * TradingViewChart - Embeds TradingView widget via WebView
 * Interval options: 1, 5, 15, 60, 240, D, W, M
 */
export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  interval = 'D',
}) => {
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
  },
  webview: {
    backgroundColor: 'transparent',
  },
});
