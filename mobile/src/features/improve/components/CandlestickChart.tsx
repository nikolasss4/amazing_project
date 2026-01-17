import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@app/theme';

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

interface CandlestickChartProps {
  tradingPair: string;
  timeframe: string;
  data?: CandleData[];
}

// Generate mock candlestick data for demo
const generateMockData = (count: number = 20): CandleData[] => {
  const data: CandleData[] = [];
  let price = 45000 + Math.random() * 5000;
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.45) * 1000; // Slight upward bias
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 300;
    const low = Math.min(open, close) - Math.random() * 300;
    
    data.push({
      open,
      high,
      low,
      close,
      timestamp: now - (count - i) * 3600000,
    });
    
    price = close;
  }
  
  return data;
};

/**
 * CandlestickChart - Beautiful simplified candlestick chart
 * Shows price action with candlesticks, price range on right, and zoom capability
 */
export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  tradingPair,
  timeframe,
  data: providedData,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartHeight, setChartHeight] = useState(240); // Dynamic height
  const data = providedData || generateMockData(20);
  
  // Calculate min/max for scaling
  const prices = data.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;
  
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  
  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
      scale.value = Math.max(0.8, Math.min(scale.value, 2)); // Limit zoom range
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }));
  
  // Helper to get Y position for price
  const getPriceY = (price: number, height: number): number => {
    return height - ((price - (minPrice - padding)) / (priceRange + 2 * padding)) * height;
  };
  
  // Handle layout to get dynamic chart height
  const onChartLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setChartHeight(height);
    }
  };
  
  // Format price for display
  const formatPrice = (price: number): string => {
    if (price >= 10000) return `$${Math.round(price).toLocaleString()}`;
    if (price >= 100) return `$${price.toFixed(0)}`;
    return `$${price.toFixed(2)}`;
  };
  
  // Price levels to display on right axis
  const priceLevels = [
    maxPrice,
    maxPrice - priceRange * 0.25,
    maxPrice - priceRange * 0.5,
    maxPrice - priceRange * 0.75,
    minPrice,
  ];
  
  return (
    <View style={styles.container}>
      {/* Header with trading pair */}
      <View style={styles.header}>
        <View style={styles.pairContainer}>
          <Text style={styles.pairText}>{tradingPair}</Text>
          <View style={styles.divider} />
          <Text style={styles.timeframeText}>{timeframe}</Text>
        </View>
      </View>
      
      {/* Chart area */}
      <GestureDetector gesture={pinchGesture}>
        <View style={styles.chartArea} onLayout={onChartLayout}>
          {/* Candlesticks */}
          <Animated.View style={[styles.candlesContainer, animatedStyle]}>
            {data.map((candle, idx) => {
              const candleWidth = 10;
              const spacing = 3;
              const x = idx * (candleWidth + spacing);
              
              const openY = getPriceY(candle.open, chartHeight);
              const closeY = getPriceY(candle.close, chartHeight);
              const highY = getPriceY(candle.high, chartHeight);
              const lowY = getPriceY(candle.low, chartHeight);
              
              const isBullish = candle.close >= candle.open;
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.abs(closeY - openY);
              const wickTop = highY;
              const wickHeight = lowY - highY;
              
              return (
                <View
                  key={idx}
                  style={[
                    styles.candleWrapper,
                    {
                      left: x,
                      width: candleWidth,
                    },
                  ]}
                >
                  {/* Wick */}
                  <View
                    style={[
                      styles.wick,
                      {
                        top: wickTop,
                        height: wickHeight,
                        backgroundColor: isBullish
                          ? theme.colors.bullish
                          : theme.colors.bearish,
                      },
                    ]}
                  />
                  
                  {/* Body */}
                  <View
                    style={[
                      styles.candleBody,
                      {
                        top: bodyTop,
                        height: Math.max(bodyHeight, 2),
                        backgroundColor: isBullish
                          ? theme.colors.bullish
                          : theme.colors.bearish,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </Animated.View>
          
          {/* Price axis on right */}
          <View style={styles.priceAxis}>
            {priceLevels.map((price, idx) => (
              <View key={idx} style={styles.priceLevel}>
                <Text style={styles.priceText}>{formatPrice(price)}</Text>
              </View>
            ))}
          </View>
          
          {/* Grid lines */}
          <View style={styles.gridLines} pointerEvents="none">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
              <View
                key={idx}
                style={[
                  styles.gridLine,
                  {
                    top: `${ratio * 100}%`,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: '#000000',
  },
  pairContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pairText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.glassBorder,
  },
  timeframeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  candlesContainer: {
    flex: 1,
    position: 'relative',
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
  },
  candleWrapper: {
    position: 'absolute',
    height: '100%',
    alignItems: 'center',
  },
  wick: {
    position: 'absolute',
    width: 2,
    opacity: 0.8,
  },
  candleBody: {
    position: 'absolute',
    width: '100%',
    borderRadius: 2,
  },
  priceAxis: {
    width: 65,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  priceLevel: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
    paddingRight: 65,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 65,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
